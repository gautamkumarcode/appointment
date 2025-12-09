import mongoose from 'mongoose';

/**
 * Utility class for managing tenant context in database queries
 */
export class TenantContext {
  /**
   * Add tenant filter to query conditions
   */
  static addTenantFilter(
    tenantId: string,
    conditions: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return {
      ...conditions,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };
  }

  /**
   * Validate that a document belongs to the specified tenant
   */
  static validateTenantOwnership(
    document: { tenantId: mongoose.Types.ObjectId } | null,
    tenantId: string
  ): boolean {
    if (!document) {
      return false;
    }

    return document.tenantId.toString() === tenantId;
  }

  /**
   * Filter array of documents to only include those belonging to tenant
   */
  static filterByTenant<T extends { tenantId: mongoose.Types.ObjectId }>(
    documents: T[],
    tenantId: string
  ): T[] {
    return documents.filter((doc) => doc.tenantId.toString() === tenantId);
  }
}
