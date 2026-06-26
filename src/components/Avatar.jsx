// Renders a user's avatar with a consistent fallback chain:
//   photo (avatarKind 'photo' + customPhotoURL) → emoji (avatar) → initial.
// `className` keeps each call site's existing styling (leaderboard__avatar,
// hamburger-menu__avatar, …); we only swap what's inside the circle.
export default function Avatar({ nickname, avatar, customPhotoURL, avatarKind, className }) {
  const initial = nickname?.charAt(0).toUpperCase() || '?';

  if (avatarKind === 'photo' && customPhotoURL) {
    return (
      <span className={className} style={{ padding: 0, overflow: 'hidden' }}>
        <img
          src={customPhotoURL}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>
    );
  }

  if (avatar) {
    return <span className={className} aria-hidden="true">{avatar}</span>;
  }

  return <span className={className}>{initial}</span>;
}
