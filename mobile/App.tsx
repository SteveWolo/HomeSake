import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import WebView from 'react-native-webview';

const site = 'https://yourhomesake.com';
const destinations = [
  { label: 'Home', path: '/' },
  { label: 'Client portal', path: '/dashboard' },
  { label: 'Staff', path: '/admin' },
] as const;

function isHomeSake(address: string) {
  try {
    const url = new URL(address);
    return url.protocol === 'https:' &&
      (url.host === 'yourhomesake.com' || url.host === 'www.yourhomesake.com');
  } catch {
    return false;
  }
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="light" /><HomeSake /></SafeAreaProvider>;
}

function HomeSake() {
  const browser = useRef<WebView>(null);
  const [source, setSource] = useState(site);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      browser.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  function openExternal(address: string) {
    if (!/^(https:|tel:|mailto:|sms:)/i.test(address)) return;
    void Linking.openURL(address).catch(() => setNotice('Couldn’t open this link on your phone.'));
  }

  function navigate(address: string) {
    setFailed(false);
    setNotice('');
    setLoading(true);
    setSource(address);
    // A second tap must return to the tab entry even after in-page navigation.
    if (address === source) {
      browser.current?.injectJavaScript(`window.location.assign(${JSON.stringify(address)}); true;`);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.brand}>HomeSake</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={!canGoBack} onPress={() => browser.current?.goBack()} style={styles.button}>
            <Text style={[styles.buttonText, !canGoBack && styles.disabled]}>Back</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setFailed(false); browser.current?.reload(); }} style={styles.button}>
            <Text style={styles.buttonText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
      {loading && !failed && <ActivityIndicator accessibilityLabel="Loading HomeSake" color="#dcb754" />}
      {!!notice && <Text accessibilityRole="alert" style={styles.message}>{notice}</Text>}
      <View style={styles.body}>
        <WebView ref={browser} source={{ uri: source }} style={styles.body}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false || isHomeSake(request.url)) return true;
            openExternal(request.url);
            return false;
          }}
          onOpenWindow={({ nativeEvent }) => {
            if (isHomeSake(nativeEvent.targetUrl)) navigate(nativeEvent.targetUrl);
            else openExternal(nativeEvent.targetUrl);
          }}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => { setLoading(true); setFailed(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setFailed(true); setLoading(false); }}
          allowsInlineMediaPlayback
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures
        />
        {failed && <View style={styles.retry}>
          <Text accessibilityRole="alert" style={styles.message}>HomeSake couldn’t load. Check your connection and try again.</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setFailed(false); browser.current?.reload(); }}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>}
      </View>
      <View style={styles.tabs}>
        {destinations.map(({ label, path }) => (
          <Pressable key={path} accessibilityRole="button" style={styles.button} onPress={() => navigate(site + path)}>
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b132b' },
  body: { flex: 1, backgroundColor: '#0b132b' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  brand: { color: '#dcb754', fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row' },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', borderTopColor: '#33405a', borderTopWidth: 1 },
  button: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#f0d17a', fontSize: 15, fontWeight: '600' },
  disabled: { color: '#8a96a8' },
  message: { color: '#fff', padding: 12, textAlign: 'center' },
  retry: { ...StyleSheet.absoluteFill, backgroundColor: '#0b132b', alignItems: 'center', justifyContent: 'center' },
});
