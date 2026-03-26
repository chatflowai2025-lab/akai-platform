'use client';

import { useState } from 'react';

const vessels = [
  {
    id: 1,
    name: 'ALFIE II',
    capacity: 'Up to 12 guests',
    feature: 'Classic wooden speedboat · 2hrs min',
    pricePerHour: 450,
    rating: 4.9,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2025/09/ALFIE-EDITED-15-2.jpg-edm-702x420.jpg',
    description:
      'Alfie II is a stunning classic wooden speedboat that turns heads wherever she glides across Sydney Harbour. With her varnished timber hull and powerful engine, she delivers an exhilarating yet intimate charter experience perfect for small groups seeking something truly special.',
  },
  {
    id: 2,
    name: 'BIRCHGROVE',
    capacity: 'Up to 20 guests',
    feature: 'Luxury motor cruiser · 2hrs min',
    pricePerHour: 550,
    rating: 5.0,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2017/09/Birchgrove-10-702x420.jpg',
    description:
      'Birchgrove is a magnificent luxury motor cruiser offering the ultimate harbour entertaining experience for up to 20 guests. Her spacious sun deck, plush interiors, and professional crew ensure every moment on the water feels effortlessly refined.',
  },
  {
    id: 3,
    name: 'COCO',
    capacity: 'Up to 15 guests',
    feature: 'Elegant timber cruiser · 2hrs min',
    pricePerHour: 480,
    rating: 4.8,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2020/03/COCO-10-702x420.jpg',
    description:
      'Coco is an elegant timber cruiser that blends classic craftsmanship with modern comfort, ideal for intimate celebrations and corporate events on Sydney Harbour. Her warm teak decks and thoughtful layout create the perfect atmosphere for guests who appreciate understated luxury.',
  },
  {
    id: 4,
    name: 'COMO',
    capacity: 'Up to 18 guests',
    feature: 'Modern sports cruiser · 2hrs min',
    pricePerHour: 620,
    rating: 4.9,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2025/09/Como-boat-sydney-FI-702x420.jpg',
    description:
      'Como is a sleek, modern sports cruiser built for those who want speed, style, and sophistication on the water. With her powerful twin engines and contemporary design, she is perfect for energetic harbour cruises and sunset escapes around the iconic Sydney landmarks.',
  },
  {
    id: 5,
    name: 'COISALINDA',
    capacity: 'Up to 25 guests',
    feature: 'Premium harbour cruiser · 2hrs min',
    pricePerHour: 750,
    rating: 5.0,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2025/03/Coisalinda-1-1-702x420.jpeg',
    description:
      'Coisalinda is our flagship premium harbour cruiser, offering unparalleled space and elegance for up to 25 guests seeking the very best Sydney has to offer on the water. Her expansive deck, world-class catering options, and dedicated crew make her the ultimate choice for milestone events and corporate hospitality.',
  },
  {
    id: 6,
    name: 'MON REVE',
    capacity: 'Up to 12 guests',
    feature: 'Classic wooden yacht · 2hrs min',
    pricePerHour: 500,
    rating: 4.9,
    photo: 'https://www.sydneyharbourexclusive.com/wp-content/uploads/2020/02/14-702x420.jpg',
    description:
      'Mon Reve — meaning "My Dream" — is a beautifully restored classic wooden yacht that captures the romance and heritage of Sydney Harbour sailing. Ideal for intimate gatherings of up to 12 guests, she delivers a timeless, soul-stirring experience under sail or motor.',
  },
];

const durations = [
  { label: '2 hrs', hours: 2 },
  { label: '3 hrs', hours: 3 },
  { label: '4 hrs', hours: 4 },
  { label: 'Half day', hours: 5 },
  { label: 'Full day', hours: 8 },
];

type Vessel = typeof vessels[0];

function BookingModal({
  vessel,
  onClose,
}: {
  vessel: Vessel;
  onClose: () => void;
}) {
  const [date, setDate] = useState('');
  const [durationIdx, setDurationIdx] = useState(0);
  const [guests, setGuests] = useState(2);
  const [submitted, setSubmitted] = useState(false);

  const selectedDuration = durations[durationIdx];
  const totalPrice = vessel.pricePerHour * selectedDuration.hours;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative">
          <img
            src={vessel.photo}
            alt={vessel.name}
            className="w-full h-56 object-cover rounded-t-2xl"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md text-gray-600 hover:text-gray-900 transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold" style={{ color: '#0a1628' }}>
                {vessel.name}
              </h2>
              <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                ⭐ {vessel.rating.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500">{vessel.capacity} · {vessel.feature}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">{vessel.description}</p>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
              style={{ focusRingColor: '#C9A84C' } as React.CSSProperties}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Duration
            </label>
            <div className="flex gap-2 flex-wrap">
              {durations.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setDurationIdx(i)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    durationIdx === i
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                  style={
                    durationIdx === i
                      ? { backgroundColor: '#0a1628', borderColor: '#0a1628' }
                      : {}
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Guests
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuests(Math.max(1, guests - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 transition-colors font-bold"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-800 w-6 text-center">{guests}</span>
              <button
                onClick={() => setGuests(Math.min(30, guests + 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 transition-colors font-bold"
              >
                +
              </button>
              <span className="text-xs text-gray-400">guests</span>
            </div>
          </div>

          {/* Price */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: '#f7f4ef' }}
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Estimated total
              </p>
              <p suppressHydrationWarning className="text-2xl font-bold mt-0.5" style={{ color: '#0a1628' }}>
                ${totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{selectedDuration.label}</p>
              <p className="text-xs text-gray-400">${vessel.pricePerHour}/hr</p>
            </div>
          </div>

          {/* CTA */}
          {submitted ? (
            <div className="text-center py-3 text-green-700 font-semibold text-sm bg-green-50 rounded-xl">
              ✅ Enquiry sent! We&apos;ll respond within 60 seconds.
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#C9A84C' }}
            >
              Request to Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VesselCard({
  vessel,
  onSelect,
}: {
  vessel: Vessel;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
      style={{
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 30px rgba(0,0,0,0.16)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden h-52">
        <img
          src={vessel.photo}
          alt={vessel.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {/* Available badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs font-semibold text-gray-700">Available</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-base" style={{ color: '#0a1628' }}>
            {vessel.name}
          </h3>
          <span className="flex items-center gap-0.5 text-sm font-semibold text-gray-700 shrink-0 ml-2">
            ⭐ {vessel.rating.toFixed(1)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-1">{vessel.capacity}</p>
        <p className="text-xs text-gray-400 mb-3">{vessel.feature}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: '#C9A84C' }}>
            From ${vessel.pricePerHour}/hr
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: '#0a1628' }}
          >
            View
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SHEDemoPage() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [searchDate, setSearchDate] = useState('');
  const [searchGuests, setSearchGuests] = useState('');
  const [searchDuration, setSearchDuration] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <section
        className="relative w-full flex items-center justify-center"
        style={{
          minHeight: '480px',
          backgroundImage:
            'url(https://www.sydneyharbourexclusive.com/wp-content/themes/sydneyharbour-060825/img/banner-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(10,22,40,0.55)' }}
        />

        <div className="relative z-10 text-center px-4 w-full max-w-3xl mx-auto">
          {/* Logo / tagline */}
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: '#C9A84C' }}
          >
            Sydney Harbour Exclusive
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
            Charter Sydney Harbour
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-8">
            Private boat hire for every occasion — from sunset cruises to corporate events
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 pt-1">
                Date
              </label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-2 py-1.5 text-sm text-gray-800 focus:outline-none bg-transparent"
              />
            </div>
            <div className="hidden md:block w-px bg-gray-100 my-1" />
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 pt-1">
                Guests
              </label>
              <select
                value={searchGuests}
                onChange={(e) => setSearchGuests(e.target.value)}
                className="w-full px-2 py-1.5 text-sm text-gray-800 focus:outline-none bg-transparent"
              >
                <option value="">Any</option>
                {[...Array(30)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} guest{i > 0 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden md:block w-px bg-gray-100 my-1" />
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 pt-1">
                Duration
              </label>
              <select
                value={searchDuration}
                onChange={(e) => setSearchDuration(e.target.value)}
                className="w-full px-2 py-1.5 text-sm text-gray-800 focus:outline-none bg-transparent"
              >
                <option value="">Any</option>
                {durations.map((d) => (
                  <option key={d.label} value={d.label}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 self-end"
              style={{ backgroundColor: '#C9A84C' }}
            >
              Search boats
            </button>
          </div>

          {searched && (
            <p className="text-white/60 text-xs mt-3">
              Showing 6 available vessels for your selection
            </p>
          )}
        </div>
      </section>

      {/* Vessel Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#0a1628' }}>
              Available vessels
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              6 exclusive boats · Sydney Harbour
            </p>
          </div>
          <span className="text-xs text-gray-400 hidden md:block">
            Click any vessel to book
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vessels.map((vessel) => (
            <VesselCard
              key={vessel.id}
              vessel={vessel}
              onSelect={() => setSelectedVessel(vessel)}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-14"
        style={{ backgroundColor: '#f7f4ef' }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-2" style={{ color: '#0a1628' }}>
            How it works
          </h3>
          <p className="text-sm text-gray-500 mb-10">
            Book your private charter in three easy steps
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🛥️',
                title: 'Choose your vessel',
                desc: 'Browse our fleet of handpicked luxury boats and find the perfect match for your occasion.',
              },
              {
                icon: '📅',
                title: 'Select date & time',
                desc: 'Pick your preferred date, duration, and number of guests. Real-time availability guaranteed.',
              },
              {
                icon: '🥂',
                title: 'Enjoy the harbour',
                desc: 'Your dedicated skipper will ensure an unforgettable Sydney Harbour experience.',
              },
            ].map((step) => (
              <div key={step.title} className="flex flex-col items-center">
                <span className="text-4xl mb-3">{step.icon}</span>
                <h4 className="font-bold text-sm mb-1" style={{ color: '#0a1628' }}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AKAI Footer Strip */}
      <footer
        className="py-4 text-center"
        style={{ backgroundColor: '#0a1628' }}
      >
        <p className="text-xs text-white/50">
          This experience powered by{' '}
          <span className="font-bold" style={{ color: '#C9A84C' }}>
            AKAI
          </span>{' '}
          ·{' '}
          <a
            href="https://getakai.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/80 transition-colors"
            style={{ color: '#C9A84C' }}
          >
            Build yours at getakai.ai
          </a>
        </p>
      </footer>

      {/* Booking Modal */}
      {selectedVessel && (
        <BookingModal
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
        />
      )}
    </div>
  );
}
