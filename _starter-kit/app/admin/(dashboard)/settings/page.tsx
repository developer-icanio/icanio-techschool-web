import { SITE_NAME, SITE_URL } from "@/lib/generateSchema";

const settings = [
  { label: "Site Name", value: SITE_NAME },
  { label: "Site URL", value: SITE_URL },
  { label: "Contact Email", value: "contact@lamblily.com" },
  { label: "Secondary Email", value: "lamblilyprivatelimited@gmail.com" },
  { label: "WhatsApp", value: "+91 96006 56964" },
  {
    label: "Address",
    value:
      "16 Vallalar Street, Saraswathy Nagar, Vandalur, Chennai, Tamil Nadu 600048, India",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="mt-2 text-gray-500">
          Site information used across metadata, structured data, and blog
          templates. This is read-only, there is no settings editor yet.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {settings.map((setting) => (
          <div
            key={setting.label}
            className="flex flex-col gap-1 border-t p-4 first:border-t-0 sm:flex-row sm:items-center sm:gap-6"
          >
            <p className="w-48 shrink-0 text-sm font-medium text-gray-500">
              {setting.label}
            </p>
            <p className="text-gray-900">{setting.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
