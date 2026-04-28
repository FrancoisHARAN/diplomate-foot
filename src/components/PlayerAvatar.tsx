interface PlayerAvatarProps {
  nickname: string;
  avatarUrl?: string;
  size?: 'small' | 'normal' | 'large' | 'xlarge';
}

const PlayerAvatar = ({ nickname, avatarUrl, size = 'normal' }: PlayerAvatarProps) => {
  const initial = nickname.charAt(0).toUpperCase();

  if (avatarUrl) {
    return <img className={`avatar-dot ${size} has-photo`} src={avatarUrl} alt="" />;
  }

  return <span className={`avatar-dot ${size}`}>{initial}</span>;
};

export default PlayerAvatar;
