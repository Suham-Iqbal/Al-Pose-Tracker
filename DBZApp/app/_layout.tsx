import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const webViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (permission && !permission.granted && permission.canAskAgain) {
        await requestPermission();
      }
      if (mediaPermission && !mediaPermission.granted && mediaPermission.canAskAgain) {
        await requestMediaPermission();
      }
    })();
  }, [permission, mediaPermission]);

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log('WebView Log:', data.message);
      }
      if (data.type === 'image' || data.type === 'video') {
        const base64Data = data.base64.split(',')[1];
        const ext = data.type === 'image' ? 'png' : 'webm';
        const fileUri = `${FileSystem.documentDirectory}Kamehameha_${Date.now()}.${ext}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const asset = await MediaLibrary.createAssetAsync(fileUri);
        // On some Androids, folder creation needs a separate check
        try {
          const album = await MediaLibrary.getAlbumAsync('DBZ_Kamehameha');
          if (album == null) {
            await MediaLibrary.createAlbumAsync('DBZ_Kamehameha', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumError) {
          // Fallback if album creation fails
          console.log('Album error, saved to default instead');
        }
        
        Alert.alert('Success!', 'Kamehameha Photo saved to your gallery!');
      }
    } catch (e) {
      console.log('Error processing message', e);
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white', marginBottom: 20 }}>Camera access is required for AI.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden />
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ 
          uri: 'https://spotty-liger-37.loca.lt?v=' + Date.now(),
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        }}
        cacheEnabled={false}
        cacheMode={'LOAD_NO_CACHE'}
        incognito={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onPermissionRequest={(event) => {
          // Crucial for Android WebView camera access
          event.grant(event.resources);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  webview: { flex: 1, backgroundColor: '#000' },
  button: {
    backgroundColor: '#ff9900',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
