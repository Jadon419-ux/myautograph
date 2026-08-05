import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client.js";

export default function TransportCompanyDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get(`/transport/companies/${id}`).then(({ data }) => setCompany(data)),
      client.get(`/transport/companies/${id}/buses`).then(({ data }) => setBuses(data)),
    ])
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-gray-500">Transport company not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">{company.name}</h1>
      {company.description && <p className="mt-1 text-sm text-gray-500">{company.description}</p>}

      <h2 className="mt-8 text-lg font-semibold text-brand-charcoal">Buses</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {buses.map((b) => (
          <div key={b.id} className="card">
            <p className="font-medium text-brand-charcoal">{b.name}</p>
            <p className="text-sm text-gray-500">Plate: {b.plate_number}</p>
            <p className="text-sm text-gray-500">{b.capacity} seats</p>
            {b.description && <p className="mt-1 text-xs text-gray-500">{b.description}</p>}
          </div>
        ))}
        {buses.length === 0 && <p className="text-sm text-gray-500">No buses listed yet.</p>}
      </div>
    </div>
  );
}
