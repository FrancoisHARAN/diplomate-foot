const AccountCard = ({ nickname, points, rank }: { nickname: string; points: number; rank?: number }) => (
  <article className="card">
    <h2>👤 {nickname}</h2>
    <p>{points} points</p>
    {rank ? <p>Rang actuel : {rank}e</p> : null}
  </article>
);

export default AccountCard;
