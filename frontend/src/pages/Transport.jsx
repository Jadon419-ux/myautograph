import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

export default function Transport() {
  const [companies, setCompanies] = useState([]);
  const [myCompany, setMyCompany] = useState(null);
  const [myBuses, setMyBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [companyForm, setCompanyForm] = useState({ name: "", description: "" });
  const [companyError, setCompanyError] = useState("");

  const [busForm, setBusForm] = useState({ name: "", plate_number: "", capacity: "", description: "" });
  const [busError, setBusError] = useState("");

  function loadCompanies() {
    client.get("/transport/companies").then(({ data }) => setCompanies(data));
  }

  useEffect(() => {
    Promise.all([
      client.get("/transport/companies").then(({ data }) => setCompanies(data)),
      client
        .get("/transport/companies/me")
        .then(({ data }) => setMyCompany(data))
        .catch(() => setMyCompany(null)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (myCompany) {
      client.get("/transport/buses/mine").then(({ data }) => setMyBuses(data));
    }
  }, [myCompany?.id]);

  async function registerCompany(e) {
    e.preventDefault();
    setCompanyError("");
    try {
      const { data } = await client.post("/transport/companies", companyForm);
      setMyCompany(data);
      loadCompanies();
    } catch (err) {
      setCompanyError(err.response?.data?.detail || "Could not register company.");
    }
  }

  async function addBus(e) {
    e.preventDefault();
    setBusError("");
    try {
      const { data } = await client.post("/transport/buses", {
        ...busForm,
        capacity: Number(busForm.capacity),
      });
      setMyBuses((prev) => [...prev, data]);
      setBusForm({ name: "", plate_number: "", capacity: "", description: "" });
      loadCompanies();
    } catch (err) {
      setBusError(err.response?.data?.detail || "Could not add bus.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-brand-charcoal">Transport tickets</h1>
      <p className="mt-1 text-sm text-gray-500">
        Browse transport companies, or register your own company and add buses.
      </p>

      {!myCompany ? (
        <div className="card mt-8 max-w-lg">
          <h2 className="font-semibold text-brand-charcoal">Register your transport company</h2>
          <form onSubmit={registerCompany} className="mt-3 space-y-3">
            <input
              className="input-field"
              placeholder="Company name"
              required
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
            />
            <textarea
              className="input-field"
              placeholder="Description (optional)"
              value={companyForm.description}
              onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
            />
            {companyError && <p className="text-xs text-red-600">{companyError}</p>}
            <button type="submit" className="btn-primary">
              Register company
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="card">
            <h2 className="font-semibold text-brand-charcoal">{myCompany.name}</h2>
            {myCompany.description && <p className="mt-1 text-sm text-gray-500">{myCompany.description}</p>}
            <p className="mt-1 text-xs text-gray-500">
              {myCompany.bus_count} bus{myCompany.bus_count === 1 ? "" : "es"}
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-brand-charcoal">Add a bus</h2>
            <form onSubmit={addBus} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="Bus name"
                required
                value={busForm.name}
                onChange={(e) => setBusForm({ ...busForm, name: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Plate number"
                required
                value={busForm.plate_number}
                onChange={(e) => setBusForm({ ...busForm, plate_number: e.target.value })}
              />
              <input
                type="number"
                min="1"
                className="input-field"
                placeholder="Capacity (seats)"
                required
                value={busForm.capacity}
                onChange={(e) => setBusForm({ ...busForm, capacity: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Description (optional)"
                value={busForm.description}
                onChange={(e) => setBusForm({ ...busForm, description: e.target.value })}
              />
              {busError && <p className="text-xs text-red-600 sm:col-span-2">{busError}</p>}
              <button type="submit" className="btn-primary sm:col-span-2">
                Add bus
              </button>
            </form>
          </div>

          <div>
            <h2 className="font-semibold text-brand-charcoal">My buses</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myBuses.map((b) => (
                <div key={b.id} className="card">
                  <p className="font-medium text-brand-charcoal">{b.name}</p>
                  <p className="text-sm text-gray-500">Plate: {b.plate_number}</p>
                  <p className="text-sm text-gray-500">{b.capacity} seats</p>
                  {b.description && <p className="mt-1 text-xs text-gray-500">{b.description}</p>}
                </div>
              ))}
              {myBuses.length === 0 && <p className="text-sm text-gray-500">No buses added yet.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-brand-charcoal">All transport companies</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} to={`/transport/${c.id}`} className="card block hover:shadow-md">
              <p className="font-medium text-brand-charcoal">{c.name}</p>
              {c.description && <p className="mt-1 text-sm text-gray-500">{c.description}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {c.bus_count} bus{c.bus_count === 1 ? "" : "es"}
              </p>
            </Link>
          ))}
          {companies.length === 0 && <p className="text-sm text-gray-500">No transport companies yet.</p>}
        </div>
      </div>
    </div>
  );
}
