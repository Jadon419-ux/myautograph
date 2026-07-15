import { Link } from "react-router-dom";
import logoSquare from "../assets/logo-square.jpg";
import { BRAND } from "../brand.js";

const roles = [
  {
    title: "Celebrities",
    description:
      "Claim your sector, share autographs directly with fans, and go live whenever you want to connect.",
    to: "/celebrities",
  },
  {
    title: "Fans",
    description:
      "Request autographs from the celebrities you follow, collect what they share, and tune into their streams.",
    to: "/signup?role=fan",
  },
  {
    title: "Agents",
    description:
      "Bring concerts onto the platform and link the celebrities performing at each event.",
    to: "/concerts",
  },
  {
    title: "Managers",
    description:
      "Onboard the artists and celebrities you represent, and manage their presence on My Autograph.",
    to: "/signup?role=manager",
  },
];

export default function Landing() {
  return (
    <div>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-20 text-center">
        <img src={logoSquare} alt="My Autograph" className="h-32 w-32 rounded-full object-cover shadow-sm" />
        <p className="text-sm italic text-brand-green">{BRAND.tagline}</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-brand-charcoal sm:text-5xl">
          The direct line between celebrities and the fans who follow them.
        </h1>
        <p className="max-w-xl text-base text-gray-600">
          My Autograph gives every celebrity a sector of their own to share autographs,
          host live streams, and stay connected with fans — while agents and managers
          bring the concerts and talent that keep it all running.
        </p>
        <div className="flex gap-4">
          <Link to="/celebrities" className="btn-primary">
            Browse celebrities
          </Link>
          <Link to="/signup" className="btn-secondary">
            Create an account
          </Link>
        </div>
      </section>

      <section className="border-t border-brand-border bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold text-brand-charcoal">
            Built for every part of the ecosystem
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Link
                key={role.title}
                to={role.to}
                className="card block transition-shadow hover:-translate-y-0.5 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-brand-green">{role.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{role.description}</p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-charcoal">
                  Enter this sector &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
