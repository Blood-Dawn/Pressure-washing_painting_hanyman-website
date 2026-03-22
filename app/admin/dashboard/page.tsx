"use client";

import { useEffect, useState } from "react";
import AdminBookingCard from "@/components/AdminBookingCard";
import type { Booking, AdminStats } from "@/types";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [bookingsRes, statsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/stats"),
        ]);

        if (!bookingsRes.ok || !statsRes.ok) {
          throw new Error("Failed to load data");
        }

        const bookingsData = await bookingsRes.json();
        const statsData = await statsRes.json();

        // API returns { success: true, data: [...] } so we extract .data
        setBookings(Array.isArray(bookingsData.data) ? bookingsData.data : []);
        setStats(statsData.data ?? statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleBookingUpdate = (updatedBooking: Booking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
    );
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter((b) =>
    ["confirmed", "in-progress", "en-route", "arrived"].includes(b.status)
  );
  const completedBookings = bookings.filter((b) =>
    ["completed", "declined"].includes(b.status)
  );

  const getFilteredBookings = () => {
    switch (activeTab) {
      case "pending":
        return pendingBookings;
      case "upcoming":
        return upcomingBookings;
      case "completed":
        return completedBookings;
      default:
        return [];
    }
  };

  const filteredBookings = getFilteredBookings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-semibold">Error loading data</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Bookings Overview</h2>
        <p className="text-gray-600">Manage and track all customer bookings</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Pending Bookings</p>
            <p className="text-3xl font-bold text-brand-dark">{stats.pendingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Confirmed This Month</p>
            <p className="text-3xl font-bold text-green-600">{stats.confirmedThisMonth}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total This Month</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalThisMonth}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Completed This Month</p>
            <p className="text-3xl font-bold text-gray-600">{stats.completedThisMonth}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {[
            { id: "pending", label: "Pending", count: pendingBookings.length },
            { id: "upcoming", label: "Upcoming", count: upcomingBookings.length },
            { id: "completed", label: "Completed", count: completedBookings.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-brand-dark text-brand-dark"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No bookings to display</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <AdminBookingCard
              key={booking.id}
              booking={booking}
              onUpdate={handleBookingUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}
