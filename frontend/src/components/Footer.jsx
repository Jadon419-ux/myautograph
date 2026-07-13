import { BRAND } from "../brand.js";
import BrandAccent from "./BrandAccent.jsx";
import { BuildingIcon, GlobeIcon, MailIcon, PhoneIcon } from "./ContactIcons.jsx";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <BrandAccent />
      <div className="bg-brand-charcoal text-brand-gray">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <BuildingIcon />
            <div>
              <p className="font-semibold text-white">{BRAND.legalName}</p>
              <p className="text-xs text-gray-400">
                Company Registration No.: <span className="text-brand-green">{BRAND.registrationNumber}</span>
              </p>
              <p className="mt-1 text-xs italic text-gray-400">{BRAND.tagline}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-2 text-sm">
              <GlobeIcon />
              <span>{BRAND.website}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MailIcon />
              <span>{BRAND.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon />
              <span>{BRAND.phone}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
