import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api";

const VideoPlayer = ({ visible, tmdbId, type = 'movie', season, episode, onClose }) => {
  const [embedUrl, setEmbedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webviewRef = useRef(null);

  useEffect(() => {
    if (visible && tmdbId) {
      fetchVideo();
    }
  }, [visible, tmdbId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync('haruka_mobile_session');
      let url;

      if (type === 'tv' && season && episode) {
        url = `/video/embed/tv/${tmdbId}/${season}/${episode}`;
      } else {
        url = `/video/embed/movie/${tmdbId}`;
      }

      const response = await fetch(`${apiUrl}${url}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.embedUrl) {
        // Try to clean the URL - add parameters to disable overlay
        let cleanUrl = data.embedUrl;

        if (!cleanUrl.includes('?')) {
          cleanUrl += '?';
        } else {
          cleanUrl += '&';
        }

        cleanUrl += 'overlay=0&autoplay=1&sub=en';
        setEmbedUrl(cleanUrl);
      } else {
        setError('No video URL returned');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShouldStartLoadWithRequest = (request) => {
    const url = request.url;

    if (url.includes('cinesrc.st') || url.includes('vidsrc')) {
      return true;
    }

    if (url.startsWith('intent://')) {
      return false;
    }

    if (url.includes('play.google.com')) {
      return false;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    return true;
  };

  // This will run continuously to remove the popup
  const injectedJavaScript = `
    (function() {
      console.log('Starting popup blocker');

      // Function to remove the rotate popup
      function removeRotatePopup() {
        console.log('Checking for popup...');

        // Try to find by text content
        var elements = document.querySelectorAll('*');
        var found = false;

        elements.forEach(function(el) {
          if (el.innerText && el.innerText.includes('Rotate Your Phone')) {
            console.log('Found rotate popup!');

            // Remove the element and all its parents until the overlay is gone
            var target = el;

            while (target) {
              var style = window.getComputedStyle(target);

              if (
                style.position === 'fixed' ||
                style.position === 'absolute' ||
                style.zIndex > 100
              ) {
                target.style.display = 'none';
                target.style.visibility = 'hidden';
                target.style.opacity = '0';
                target.style.pointerEvents = 'none';
                target.remove();
                found = true;
                break;
              }

              target = target.parentElement;
            }
          }
        });

        // If we didn't find it by text, try to click the continue button
        if (!found) {
          var buttons = document.querySelectorAll(
            'button, .button, [role="button"]'
          );

          buttons.forEach(function(btn) {
            if (
              btn.innerText &&
              (
                btn.innerText.includes('Continue') ||
                btn.innerText.includes('Anyways')
              )
            ) {
              console.log('Found continue button, clicking it');
              btn.click();
              btn.style.display = 'none';
              found = true;
            }
          });
        }

        // Try to find by class names
        if (!found) {
          var selectors = [
            '.rotate-popup',
            '.orientation-overlay',
            '.landscape-modal',
            '.modal-overlay',
            '.popup-container',
            '.overlay-content'
          ];

          selectors.forEach(function(selector) {
            var elements = document.querySelectorAll(selector);

            elements.forEach(function(el) {
              if (el.innerText && el.innerText.includes('Rotate')) {
                el.remove();
                found = true;
              }
            });
          });
        }

        // Remove any backdrop elements
        var backdrops = document.querySelectorAll(
          '.backdrop, .modal-backdrop, .overlay'
        );

        backdrops.forEach(function(el) {
          if (el.innerText && el.innerText.includes('Rotate')) {
            el.remove();
          }
        });

        console.log('Popup check complete');
        return found;
      }

      // Run immediately
      removeRotatePopup();

      // Run every 500ms
      var intervalId = setInterval(function() {
        removeRotatePopup();
      }, 500);

      // Also run on DOM changes
      var observer = new MutationObserver(function() {
        removeRotatePopup();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // Override createElement to catch popups early
      var originalCreateElement = document.createElement;

      document.createElement = function(tagName) {
        var element = originalCreateElement.call(this, tagName);

        if (tagName === 'div' || tagName === 'section') {
          var originalAppendChild = element.appendChild;

          element.appendChild = function(child) {
            if (
              child.innerText &&
              child.innerText.includes('Rotate Your Phone')
            ) {
              console.log('Blocked popup from being added');
              return null;
            }

            return originalAppendChild.call(this, child);
          };
        }

        return element;
      };

      console.log('Popup blocker fully active');
    })();
  `;

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#b2ff71" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.centered}>
            <Text style={styles.errorText}>Error: {error}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchVideo}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕ Close</Text>
        </TouchableOpacity>

        <WebView
          ref={webviewRef}
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onShouldStartLoadWithRequest={
            handleShouldStartLoadWithRequest
          }
          onNavigationStateChange={() => {}}
          injectedJavaScript={injectedJavaScript}
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScript
          }
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator
                size="large"
                color="#b2ff71"
              />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError('Failed to load video');
          }}
          onMessage={(event) => {
            // Handle any messages from the webview if needed
            console.log(
              'WebView message:',
              event.nativeEvent.data
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  webview: {
    flex: 1,
    marginTop: 10,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 20,
  },

  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },

  errorText: {
    color: 'red',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },

  closeButton: {
    position: 'absolute',
    top: 70,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 30,
  },

  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  retryButton: {
    backgroundColor: '#b2ff71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  retryButtonText: {
    color: '#09111f',
    fontSize: 16,
    fontWeight: 'bold',
  },

  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default VideoPlayer;
