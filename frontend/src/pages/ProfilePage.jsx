import React, { useEffect, useState } from 'react';
import { UserRound, Mail, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function ProfilePage() {
  const {
    user,
    isProfileLoading,
    fetchProfile,
    updateProfile,
  } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (user?.name || user?.email) {
      setForm({
        name: user?.name || '',
        email: user?.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user?.id) {
        setIsLoadingProfile(true);
        const result = await fetchProfile();
        if (!result.success && isMounted) {
          toast.error(result.error || 'Failed to load profile');
        }
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [fetchProfile, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await updateProfile(form);

    if (result.success) {
      toast.success(result.message || 'Profile updated');
      return;
    }

    toast.error(result.error || 'Could not update profile');
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-white font-bold">My Profile</h1>
        <p className="text-slate-500 mt-1">Update your account details used across the platform.</p>
      </div>

      <div className="card">
        {(isLoadingProfile && !user) ? (
          <div className="text-slate-500 text-sm">Loading profile...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  className="input pl-10"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  className="input pl-10"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-primary" disabled={isProfileLoading}>
                {isProfileLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
