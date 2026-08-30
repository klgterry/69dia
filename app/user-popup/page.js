"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/components/user/useUserProfile";
import UserProfilePanel from "@/components/user/UserProfilePanel";

export default function UserPopupPage() {
  const [name, setName] = useState(null);
  const [seasonParam, setSeasonParam] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setName(params.get("name"));
    setSeasonParam(params.get("season"));
  }, []);

  const profile = useUserProfile(name, seasonParam);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pt-12">
      <UserProfilePanel {...profile} selectedUser={name} />
    </div>
  );
}
