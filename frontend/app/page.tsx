'use client';

import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle,
  MessageSquare,
  Shield,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
                <span className="text-lg font-bold text-white">AI</span>
              </div>
              <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-2xl font-bold text-transparent">
                Scheduler
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden items-center space-x-8 md:flex">
              <a href="#features" className="text-gray-600 transition-colors hover:text-sky-600">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 transition-colors hover:text-sky-600">
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 transition-colors hover:text-sky-600"
              >
                Reviews
              </a>
              <Link href="/login" className="text-gray-600 transition-colors hover:text-sky-600">
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2 text-white shadow-lg transition-all duration-200 hover:from-sky-600 hover:to-blue-700 hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu */}
            <div className="flex items-center space-x-2 md:hidden">
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 py-20 sm:py-32">
        <div className="bg-grid-pattern absolute inset-0 opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8 inline-flex items-center rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
              <Bot className="mr-2 h-4 w-4" />
              AI-Powered Appointment Scheduling
            </div>
            <h1 className="mb-6 text-4xl font-bold text-gray-900 sm:text-6xl lg:text-7xl">
              Smart Scheduling
              <span className="block bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
              Transform your business with AI-powered appointment scheduling. Let our intelligent
              assistant handle bookings, answer questions, and grow your customer base 24/7.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="group flex items-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-200 hover:from-sky-600 hover:to-blue-700 hover:shadow-2xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/book/demo"
                className="rounded-xl border border-gray-300 px-8 py-4 text-lg font-semibold text-gray-600 transition-all duration-200 hover:border-sky-300 hover:text-sky-600"
              >
                View Demo
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Setup in 5 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to grow your business
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              Our AI-powered platform handles the complexity of appointment scheduling, so you can
              focus on what matters most - your customers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-sky-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-sky-100 p-3">
                <Bot className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-gray-600">
                24/7 intelligent chatbot that handles customer inquiries, books appointments, and
                provides instant responses to common questions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-emerald-100 p-3">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Smart Scheduling</h3>
              <p className="text-gray-600">
                Intelligent calendar management with automatic conflict detection, buffer times, and
                optimal slot suggestions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-purple-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Multi-Channel Support</h3>
              <p className="text-gray-600">
                Connect with customers through WhatsApp, Facebook Messenger, Instagram, and your
                website chat widget.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-amber-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-amber-100 p-3">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Analytics & Insights</h3>
              <p className="text-gray-600">
                Detailed reports on booking trends, customer behavior, and business performance to
                help you make data-driven decisions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-rose-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-rose-100 p-3">
                <Shield className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Secure & Reliable</h3>
              <p className="text-gray-600">
                Enterprise-grade security with data encryption, GDPR compliance, and 99.9% uptime
                guarantee.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl border border-gray-200 p-8 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-indigo-100 p-3">
                <Zap className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Quick Setup</h3>
              <p className="text-gray-600">
                Get started in minutes with our intuitive setup wizard. No technical knowledge
                required - just follow the simple steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-sky-500 to-blue-600 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Trusted by businesses worldwide
            </h2>
            <p className="text-xl text-blue-100">
              Join thousands of businesses that have transformed their scheduling process
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-white sm:text-5xl">10K+</div>
              <div className="text-blue-100">Active Businesses</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-white sm:text-5xl">1M+</div>
              <div className="text-blue-100">Appointments Booked</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-white sm:text-5xl">98%</div>
              <div className="text-blue-100">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-white sm:text-5xl">24/7</div>
              <div className="text-blue-100">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              Choose the plan that's right for your business. All plans include our AI assistant and
              core features.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:shadow-lg">
              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Starter</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mb-6 text-gray-600">Perfect for small businesses getting started</p>
                <Link
                  href="/register"
                  className="inline-block w-full rounded-lg bg-gray-100 px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:bg-gray-200"
                >
                  Start Free Trial
                </Link>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Up to 100 appointments/month
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  AI chatbot assistant
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Basic analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Email support
                </li>
              </ul>
            </div>

            {/* Professional Plan */}
            <div className="relative rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-8 transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                <span className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-1 text-sm font-semibold text-white">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Professional</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$79</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mb-6 text-gray-600">Ideal for growing businesses</p>
                <Link
                  href="/register"
                  className="inline-block w-full rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-center font-semibold text-white transition-all duration-200 hover:from-sky-600 hover:to-blue-700"
                >
                  Start Free Trial
                </Link>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Up to 500 appointments/month
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Advanced AI features
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Multi-channel support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Priority support
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:shadow-lg">
              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$199</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mb-6 text-gray-600">For large businesses with custom needs</p>
                <Link
                  href="/register"
                  className="inline-block w-full rounded-lg bg-gray-100 px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:bg-gray-200"
                >
                  Contact Sales
                </Link>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Unlimited appointments
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Custom AI training
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  API access
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Custom integrations
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                  Dedicated support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              What our customers say
            </h2>
            <p className="text-xl text-gray-600">
              Don't just take our word for it - hear from businesses like yours
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                ))}
              </div>
              <p className="mb-6 text-gray-600">
                "The AI assistant has completely transformed how we handle bookings. Our customers
                love the instant responses, and we've seen a 40% increase in appointments."
              </p>
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 font-semibold text-white">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Sarah Mitchell</div>
                  <div className="text-gray-500">Beauty Salon Owner</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                ))}
              </div>
              <p className="mb-6 text-gray-600">
                "Setup was incredibly easy, and the analytics help us understand our business
                better. The AI handles 90% of our customer inquiries automatically."
              </p>
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 font-semibold text-white">
                  MJ
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Michael Johnson</div>
                  <div className="text-gray-500">Dental Practice</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                ))}
              </div>
              <p className="mb-6 text-gray-600">
                "The multi-channel support is amazing. Customers can book through WhatsApp, our
                website, or Facebook - all managed in one place."
              </p>
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 font-semibold text-white">
                  EL
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Emily Lopez</div>
                  <div className="text-gray-500">Fitness Studio</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            Ready to transform your business?
          </h2>
          <p className="mb-8 text-xl text-gray-300">
            Join thousands of businesses using AI Scheduler to automate their appointment booking
            and grow their customer base.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group flex items-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-200 hover:from-sky-600 hover:to-blue-700 hover:shadow-2xl"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="text-sm text-gray-400">No credit card required • 14-day free trial</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Logo and description */}
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4 flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
                  <span className="text-sm font-bold text-white">AI</span>
                </div>
                <span className="text-xl font-bold text-white">Scheduler</span>
              </div>
              <p className="mb-4 max-w-md text-gray-400">
                The most intelligent appointment scheduling platform for modern businesses. Automate
                bookings, engage customers, and grow your business with AI.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="transition-colors hover:text-sky-400">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-sky-400">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-sky-400">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="transition-colors hover:text-sky-400">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="transition-colors hover:text-sky-400">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-sky-400">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-sky-400">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-sky-400">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AI Scheduler. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
