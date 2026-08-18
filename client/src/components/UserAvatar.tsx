import React, { useState, useEffect } from 'react';

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Extracts 1-2 character uppercase initials from name or email.
 * Example: "Aditya Sharma" -> "AS", "Aditya" -> "AD", "aditya@domain.com" -> "A"
 */
export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return 'U';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  picture,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever picture prop changes
  useEffect(() => {
    setImageError(false);
  }, [picture]);

  const initials = getInitials(name, email);

  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  }[size];

  // If photo URL exists and hasn't failed to load, render img tag
  if (picture && !imageError) {
    return (
      <img
        src={picture}
        alt={name || email || 'User Avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-teal-200/60 shadow-2xs ${className}`}
      />
    );
  }

  // Fallback: Initials badge inside styled circle
  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#043c44] text-teal-200 font-semibold flex items-center justify-center shadow-2xs select-none ${className}`}
      title={name || email || 'User'}
      aria-label={name || email || 'User avatar'}
    >
      {initials}
    </div>
  );
};
