import { FiUser } from 'react-icons/fi';

export default function UserAvatar({ src, name, size = 'md' }) {
  const label = name || 'User';

  return (
    <span className={`user-avatar user-avatar--${size}`} aria-label={label} title={label}>
      {src ? <img src={src} alt={label} /> : <FiUser />}
    </span>
  );
}
