import { SettingsTabs } from "./_components/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="px-6 pt-5">
        <SettingsTabs />
      </div>
      {children}
    </div>
  );
}
