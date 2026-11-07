import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const backend = url && key ? createClient(url, key, {
  auth: { persistSession: false, detectSessionInUrl: false },
}) : null;
const website = 'https://yourhomesake.com';

type Visit = { id: string; service: string; scheduled_at: string; status: string };
type Home = { staff: boolean; visits: Visit[] };

export default function App() {
  return <SafeAreaProvider><SafeAreaView style={styles.screen}><HomeSake /></SafeAreaView></SafeAreaProvider>;
}

function HomeSake() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [home, setHome] = useState<Home | null>(null);

  useEffect(() => {
    const listener = backend?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setHome(null);
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!backend || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await backend.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      const role = await backend.rpc('has_role', { _user_id: result.data.user.id, _role: 'admin' });
      if (role.error) throw role.error;
      const query = backend.from('appointments').select('id,service,scheduled_at,status');
      if (role.data) {
        const centralDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
        const start = new Date();
        start.setUTCDate(start.getUTCDate() - 1);
        const visits = await query.gte('scheduled_at', start.toISOString()).order('scheduled_at');
        if (visits.error) throw visits.error;
        const today = visits.data.filter((visit) => visit.status !== 'Cancelled' &&
          new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(visit.scheduled_at)) === centralDay);
        setHome({ staff: true, visits: today });
      } else {
        const profile = await backend.from('profiles')
          .select('subscription_status,cancellation_requested,current_period_end')
          .eq('id', result.data.user.id).maybeSingle();
        if (profile.error) throw profile.error;
        const membership = profile.data;
        if (membership?.subscription_status === 'cancelled' ||
          ((membership?.subscription_status === 'cancelling' || membership?.cancellation_requested) &&
            membership.current_period_end && Date.parse(membership.current_period_end) <= Date.now())) {
          throw new Error('Your membership has ended. Open the website to manage your account.');
        }
        const visits = await query.in('status', ['Scheduled', 'Rescheduled'])
          .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(20);
        if (visits.error) throw visits.error;
        setHome({ staff: false, visits: visits.data });
      }
    } catch (cause) {
      await backend.auth.signOut({ scope: 'local' });
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function openWebsite(path: string) {
    void Linking.openURL(website + path).catch(() => setError('Could not open the website.'));
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.brand}>HomeSake</Text>
      <Text accessibilityRole="header" style={styles.heading}>{home ? (home.staff ? 'Today’s visits' : 'Upcoming visits') : 'Welcome home'}</Text>
      {home ? <>
        {home.visits.length === 0 && <Text style={styles.copy}>No visits to show.</Text>}
        {home.visits.map((visit) => (
          <View key={visit.id} style={styles.card}>
            <Text style={styles.title}>{visit.service}</Text>
            <Text style={styles.copy}>{new Date(visit.scheduled_at).toLocaleString('en-US', {
              timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short',
            })} CT · {visit.status}</Text>
            {!home.staff && <Button title="Open visit on website" onPress={() => openWebsite('/dashboard?visit=' + encodeURIComponent(visit.id))} />}
          </View>
        ))}
        <Button title={home.staff ? 'Open admin website' : 'Open full client portal'} onPress={() => openWebsite(home.staff ? '/admin' : '/dashboard')} />
        <Button title="Sign out" onPress={() => { setHome(null); setPassword(''); void backend?.auth.signOut({ scope: 'local' }); }} />
      </> : <>
        <Text style={styles.copy}>Sign in with your HomeSake website account.</Text>
        {!backend && <Text style={styles.error}>Connect this test build to HomeSake before signing in.</Text>}
        <TextInput accessibilityLabel="Email" placeholder="Email" placeholderTextColor="#aab6c8" autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput accessibilityLabel="Password" placeholder="Password" placeholderTextColor="#aab6c8" secureTextEntry autoComplete="current-password"
          value={password} onChangeText={setPassword} style={styles.input} />
        <Button title="Sign in" disabled={!backend || busy || !email.trim() || !password} onPress={() => void signIn()} />
        <Button title="Reset password on website" onPress={() => openWebsite('/login')} />
      </>}
      {busy && <ActivityIndicator accessibilityLabel="Signing in" />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 24, paddingTop: 48, gap: 16 },
  brand: { color: '#dcb754', fontSize: 24, fontWeight: '700' },
  heading: { color: '#fff', fontSize: 32, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  copy: { color: '#d2d9e5', fontSize: 16 },
  input: { color: '#fff', backgroundColor: '#17223d', padding: 14, borderRadius: 8, fontSize: 16 },
  card: { backgroundColor: '#17223d', padding: 16, borderRadius: 10, gap: 8 },
  error: { color: '#ffb4ab', fontSize: 15 },
});
