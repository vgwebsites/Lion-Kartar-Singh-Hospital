
import supabase from './db-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require a private setup token stored only on the server.
  const setupToken = process.env.ADMIN_SETUP_TOKEN;
  const providedToken = req.headers['x-setup-token'];

  if (!setupToken || providedToken !== setupToken) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const email = 'girishposture3@gmail.com';

    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const user = users.users.find(
      u => u.email?.toLowerCase() === email
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } =
      await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...(user.app_metadata || {}),
          lks_role: 'administrator',
          lks_display_name: 'Hospital Admin'
        }
      });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Administrator role assigned successfully.',
      email: data.user.email
    });
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    return res.status(500).json({
      error: 'Unable to assign administrator role.'
    });
  }
}
