import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { logger } from '../utils/logger';

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface BookingAnalytics {
  totalBookings: number;
  totalRevenue: number;
  noShowCount: number;
  repeatCustomerCount: number;
}

export interface DetailedAnalytics extends BookingAnalytics {
  bookingsByStatus: {
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  averageBookingValue: number;
  paymentBreakdown: {
    paid: number;
    unpaid: number;
    refunded: number;
  };
}

class AnalyticsService {
  /**
   * Calculate total bookings for a time period
   */
  async getTotalBookings(tenantId: string, filters: AnalyticsFilters = {}): Promise<number> {
    try {
      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        query.startTime = {};
        if (filters.startDate) {
          query.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.startTime.$lte = filters.endDate;
        }
      }

      const totalBookings = await Appointment.countDocuments(query);
      return totalBookings;
    } catch (error) {
      logger.error('Error calculating total bookings:', error);
      throw error;
    }
  }

  /**
   * Calculate total revenue from paid appointments
   */
  async getTotalRevenue(tenantId: string, filters: AnalyticsFilters = {}): Promise<number> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        paymentStatus: 'paid',
        amount: { $exists: true, $ne: null },
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      const result = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]);

      return result.length > 0 ? result[0].totalRevenue : 0;
    } catch (error) {
      logger.error('Error calculating total revenue:', error);
      throw error;
    }
  }

  /**
   * Count no-show appointments
   */
  async getNoShowCount(tenantId: string, filters: AnalyticsFilters = {}): Promise<number> {
    try {
      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        status: 'no-show',
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        query.startTime = {};
        if (filters.startDate) {
          query.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.startTime.$lte = filters.endDate;
        }
      }

      const noShowCount = await Appointment.countDocuments(query);
      return noShowCount;
    } catch (error) {
      logger.error('Error counting no-show appointments:', error);
      throw error;
    }
  }

  /**
   * Identify and count repeat customers (customers with more than one appointment)
   */
  async getRepeatCustomerCount(tenantId: string, filters: AnalyticsFilters = {}): Promise<number> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      const result = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$customerId',
            appointmentCount: { $sum: 1 },
          },
        },
        {
          $match: {
            appointmentCount: { $gt: 1 },
          },
        },
        {
          $count: 'repeatCustomers',
        },
      ]);

      return result.length > 0 ? result[0].repeatCustomers : 0;
    } catch (error) {
      logger.error('Error counting repeat customers:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a time period
   */
  async getAnalytics(tenantId: string, filters: AnalyticsFilters = {}): Promise<BookingAnalytics> {
    try {
      const [totalBookings, totalRevenue, noShowCount, repeatCustomerCount] = await Promise.all([
        this.getTotalBookings(tenantId, filters),
        this.getTotalRevenue(tenantId, filters),
        this.getNoShowCount(tenantId, filters),
        this.getRepeatCustomerCount(tenantId, filters),
      ]);

      return {
        totalBookings,
        totalRevenue,
        noShowCount,
        repeatCustomerCount,
      };
    } catch (error) {
      logger.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get detailed analytics with additional breakdowns
   */
  async getDetailedAnalytics(
    tenantId: string,
    filters: AnalyticsFilters = {}
  ): Promise<DetailedAnalytics> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      // Get basic analytics
      const basicAnalytics = await this.getAnalytics(tenantId, filters);

      // Get bookings by status
      const statusBreakdown = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const bookingsByStatus = {
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };

      statusBreakdown.forEach((item) => {
        switch (item._id) {
          case 'confirmed':
            bookingsByStatus.confirmed = item.count;
            break;
          case 'completed':
            bookingsByStatus.completed = item.count;
            break;
          case 'cancelled':
            bookingsByStatus.cancelled = item.count;
            break;
          case 'no-show':
            bookingsByStatus.noShow = item.count;
            break;
        }
      });

      // Get payment breakdown
      const paymentBreakdown = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      const paymentStats = {
        paid: 0,
        unpaid: 0,
        refunded: 0,
      };

      paymentBreakdown.forEach((item) => {
        switch (item._id) {
          case 'paid':
            paymentStats.paid = item.count;
            break;
          case 'unpaid':
            paymentStats.unpaid = item.count;
            break;
          case 'refunded':
            paymentStats.refunded = item.count;
            break;
        }
      });

      // Calculate average booking value
      const averageBookingValue =
        basicAnalytics.totalBookings > 0 ? basicAnalytics.totalRevenue / paymentStats.paid : 0;

      return {
        ...basicAnalytics,
        bookingsByStatus,
        averageBookingValue,
        paymentBreakdown: paymentStats,
      };
    } catch (error) {
      logger.error('Error getting detailed analytics:', error);
      throw error;
    }
  }

  /**
   * Get booking statistics by status
   */
  async getBookingStats(tenantId: string, filters: AnalyticsFilters = {}): Promise<any> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      // Get total bookings
      const totalBookings = await Appointment.countDocuments(matchStage);

      // Get bookings by status
      const statusBreakdown = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const bookingsByStatus = {
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        noShowBookings: 0,
      };

      statusBreakdown.forEach((item) => {
        switch (item._id) {
          case 'confirmed':
            bookingsByStatus.confirmedBookings = item.count;
            break;
          case 'completed':
            bookingsByStatus.completedBookings = item.count;
            break;
          case 'cancelled':
            bookingsByStatus.cancelledBookings = item.count;
            break;
          case 'no-show':
            bookingsByStatus.noShowBookings = item.count;
            break;
        }
      });

      return {
        totalBookings,
        ...bookingsByStatus,
      };
    } catch (error) {
      logger.error('Error getting booking stats:', error);
      throw error;
    }
  }

  /**
   * Get revenue statistics by payment status
   */
  async getRevenueStats(tenantId: string, filters: AnalyticsFilters = {}): Promise<any> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        amount: { $exists: true, $ne: null },
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      // Get revenue by payment status
      const revenueBreakdown = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$paymentStatus',
            totalRevenue: { $sum: '$amount' },
          },
        },
      ]);

      const revenueStats = {
        paidRevenue: 0,
        unpaidRevenue: 0,
        refundedRevenue: 0,
        totalRevenue: 0,
      };

      revenueBreakdown.forEach((item) => {
        switch (item._id) {
          case 'paid':
            revenueStats.paidRevenue = item.totalRevenue;
            break;
          case 'unpaid':
            revenueStats.unpaidRevenue = item.totalRevenue;
            break;
          case 'refunded':
            revenueStats.refundedRevenue = item.totalRevenue;
            break;
        }
      });

      revenueStats.totalRevenue = revenueStats.paidRevenue + revenueStats.unpaidRevenue;

      return revenueStats;
    } catch (error) {
      logger.error('Error getting revenue stats:', error);
      throw error;
    }
  }

  /**
   * Get no-show statistics
   */
  async getNoShowStats(tenantId: string, filters: AnalyticsFilters = {}): Promise<any> {
    try {
      const [noShowCount, totalBookings] = await Promise.all([
        this.getNoShowCount(tenantId, filters),
        this.getTotalBookings(tenantId, filters),
      ]);

      const rate = totalBookings > 0 ? noShowCount / totalBookings : 0;

      return {
        count: noShowCount,
        rate,
      };
    } catch (error) {
      logger.error('Error getting no-show stats:', error);
      throw error;
    }
  }

  /**
   * Get customer analytics including new and repeat customers
   */
  async getCustomerAnalytics(tenantId: string, filters: AnalyticsFilters = {}): Promise<any> {
    try {
      const matchStage: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
      };

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        matchStage.startTime = {};
        if (filters.startDate) {
          matchStage.startTime.$gte = filters.startDate;
        }
        if (filters.endDate) {
          matchStage.startTime.$lte = filters.endDate;
        }
      }

      // Get total unique customers in the period
      const totalCustomersResult = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$customerId',
          },
        },
        {
          $count: 'totalCustomers',
        },
      ]);

      const totalCustomers =
        totalCustomersResult.length > 0 ? totalCustomersResult[0].totalCustomers : 0;

      // Get repeat customers (customers with more than one appointment in the period)
      const repeatCustomersResult = await Appointment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$customerId',
            appointmentCount: { $sum: 1 },
          },
        },
        {
          $match: {
            appointmentCount: { $gt: 1 },
          },
        },
        {
          $count: 'repeatCustomers',
        },
      ]);

      const repeatCustomers =
        repeatCustomersResult.length > 0 ? repeatCustomersResult[0].repeatCustomers : 0;
      const newCustomers = totalCustomers - repeatCustomers;
      const repeatCustomerRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;

      return {
        totalCustomers,
        newCustomers,
        repeatCustomers,
        repeatCustomerRate,
      };
    } catch (error) {
      logger.error('Error getting customer analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific date range
   */
  async getAnalyticsForDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookingAnalytics> {
    return this.getAnalytics(tenantId, { startDate, endDate });
  }

  /**
   * Get monthly analytics for the current year
   */
  async getMonthlyAnalytics(tenantId: string, year?: number): Promise<any[]> {
    try {
      const currentYear = year || new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

      const result = await Appointment.aggregate([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            startTime: {
              $gte: startOfYear,
              $lte: endOfYear,
            },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$startTime' },
              year: { $year: '$startTime' },
            },
            totalBookings: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0],
              },
            },
            noShowCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { '_id.month': 1 },
        },
      ]);

      // Fill in missing months with zero values
      const monthlyData = [];
      for (let month = 1; month <= 12; month++) {
        const existingData = result.find((item) => item._id.month === month);
        monthlyData.push({
          month,
          year: currentYear,
          totalBookings: existingData?.totalBookings || 0,
          totalRevenue: existingData?.totalRevenue || 0,
          noShowCount: existingData?.noShowCount || 0,
        });
      }

      return monthlyData;
    } catch (error) {
      logger.error('Error getting monthly analytics:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
