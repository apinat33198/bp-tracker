import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface BPReading {
  id: string;
  timestamp: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  notes: string;
}

const API_URL = '/api';

const getCurrentDateTime = () => {
  const now = new Date();
  return now.toISOString();
};

const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const BloodPressureTracker: React.FC = () => {
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const response = await fetch(`${API_URL}/readings`);
        if (!response.ok) throw new Error('Failed to fetch readings');
        const data = await response.json();
        setReadings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load readings');
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, []);

  const addReading = async () => {
    if (systolic && diastolic && pulse) {
      const newReading: BPReading = {
        id: Date.now().toString(),
        timestamp: getCurrentDateTime(),
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: Number(pulse),
        notes: notes
      };

      try {
        const response = await fetch(`${API_URL}/readings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newReading),
        });

        if (!response.ok) throw new Error('Failed to add reading');
        
        const savedReading = await response.json();
        setReadings([...readings, savedReading]);
        setSystolic('');
        setDiastolic('');
        setPulse('');
        setNotes('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add reading');
      }
    }
  };

  const exportToCSV = () => {
    const filteredReadings = filterReadings();
    const csvContent = [
      ['Date', 'Time', 'Systolic', 'Diastolic', 'Pulse', 'Notes'].join(','),
      ...filteredReadings.map(reading => {
        return [
          formatDateTime(reading.timestamp),
          reading.systolic,
          reading.diastolic,
          reading.pulse,
          `"${reading.notes}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blood-pressure-readings-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filterReadings = () => {
    return readings.filter(reading => {
      if (!startDate && !endDate) return true;
      const readingDate = new Date(reading.timestamp);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return readingDate >= start && readingDate <= end;
    });
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md mb-6 p-6">
        <h2 className="text-2xl font-bold mb-4">Blood Pressure Tracker</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="number"
            placeholder="Systolic"
            className="px-4 py-2 border rounded-lg"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
          />
          <input
            type="number"
            placeholder="Diastolic"
            className="px-4 py-2 border rounded-lg"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
          />
          <input
            type="number"
            placeholder="Pulse"
            className="px-4 py-2 border rounded-lg"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
          />
          <input
            type="text"
            placeholder="Notes"
            className="px-4 py-2 border rounded-lg"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={addReading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Add Reading
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6 p-6">
        <h2 className="text-2xl font-bold mb-4">Filter & Export</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="date"
            className="px-4 py-2 border rounded-lg"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="px-4 py-2 border rounded-lg"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            onClick={exportToCSV}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Export to CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6 p-6">
        <h2 className="text-2xl font-bold mb-4">Trends</h2>
        <div className="w-full overflow-x-auto">
          <LineChart width={800} height={300} data={filterReadings()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatDateTime} />
            <YAxis />
            <Tooltip labelFormatter={formatDateTime} />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#8884d8" name="Systolic" />
            <Line type="monotone" dataKey="diastolic" stroke="#82ca9d" name="Diastolic" />
            <Line type="monotone" dataKey="pulse" stroke="#ffc658" name="Pulse" />
          </LineChart>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Reading History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Systolic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diastolic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pulse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filterReadings().reverse().map((reading) => (
                <tr key={reading.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(reading.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reading.systolic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reading.diastolic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reading.pulse}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reading.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BloodPressureTracker;