import AdminPanel from '../components/AdminPanel';
import { playerService } from '../services/playerService';

const AdminPage = () => <AdminPanel players={playerService.list()} />;

export default AdminPage;
