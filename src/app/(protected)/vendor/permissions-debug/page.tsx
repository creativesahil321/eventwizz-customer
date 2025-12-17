import PermissionDebug from "../permission-debug";

export default function PermissionsDebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-white">Permissions Debug Page</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Permissions Tester</h2>
        <p className="mb-4">
          This page helps you debug permission issues by showing a detailed view
          of:
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2">
          <li>Your current permissions from the API</li>
          <li>Each menu item&apos;s required permission</li>
          <li>How menu permissions are mapped to API format</li>
          <li>Whether you have access to each menu item</li>
        </ul>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-bold text-yellow-800">Permission Format</h3>
          <p className="text-yellow-800 mt-2">
            Your API permissions use the format{" "}
            <code className="bg-yellow-100 px-1 rounded">action-resource</code>{" "}
            (e.g., &quot;read-newsletter&quot;) while menu configuration uses{" "}
            <code className="bg-yellow-100 px-1 rounded">resource.action</code>{" "}
            (e.g., &quot;newsletter.read&quot;).
          </p>
        </div>
      </div>

      <PermissionDebug />
    </div>
  );
}
