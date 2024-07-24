import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { Song } from '@/types';  // Certifique-se de ajustar o caminho conforme necessário
import Svg, { Line } from 'react-native-svg';

interface SoundObject {
  name: string;
  soundObject: Audio.Sound;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
}

const MultitrackScreen = () => {
  const { id } = useLocalSearchParams();
  const [song, setSong] = useState<Song | null>(null);
  const [tracks, setTracks] = useState<SoundObject[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(0); // Para o cursor de execução
  const [duration, setDuration] = useState<number>(0); // Duração da faixa
  const animationRef = useRef(new Animated.Value(0)).current; // Animação do cursor

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await fetch('https://drive.google.com/uc?export=download&id=1qFBZj9dPllscIrgvYkqXVsxLD5zaFHgX'); // Substitua pela URL do seu arquivo JSON
        const data: Song[] = await response.json();
        const selectedSong = data.find((song) => song.id === id);
        setSong(selectedSong || null);

        if (selectedSong) {
          const trackPromises = selectedSong.tracks.map(async (track) => {
            const soundObject = new Audio.Sound();
            await soundObject.loadAsync({ uri: track.url }, { shouldPlay: false });
            await soundObject.setVolumeAsync(1); // Define o volume inicial como máximo

            // Obtendo a duração da faixa
            const status = await soundObject.getStatusAsync();
            if (status.isLoaded && !status.isBuffering && status.durationMillis) {
              setDuration(status.durationMillis);
            }

            return { name: track.name, soundObject, volume: 1, isMuted: false, isSolo: false }; // Inicialize o volume como 1, não mutado e não solo
          });
          const loadedTracks = await Promise.all(trackPromises);
          setTracks(loadedTracks);
        }
      } catch (error) {
        Alert.alert('Erro', `Erro ao carregar a música: `);
      } finally {
        setLoading(false); // Remove o carregamento quando a música estiver carregada
      }
    };
    fetchSong();

    return () => {
      tracks.forEach(({ soundObject }) => soundObject.unloadAsync());
    };
  }, [id]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await Promise.all(tracks.map(({ soundObject }) => soundObject.pauseAsync()));
        animationRef.stopAnimation(); // Para a animação do cursor
      } else {
        const startTime = Date.now() + 100; // Adiciona um pequeno buffer de tempo
        await Promise.all(tracks.map(async ({ soundObject }) => {
          await soundObject.setPositionAsync(0);
          const delay = startTime - Date.now();
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          await soundObject.playAsync();
        }));

        // Inicia a animação do cursor
        Animated.loop(
          Animated.timing(animationRef, {
            toValue: 1,
            duration: duration, // Ajusta para a duração da faixa
            useNativeDriver: true,
          })
        ).start();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      Alert.alert('Erro', `Erro ao reproduzir a faixa: `);
    }
  };

  const handleStop = async () => {
    try {
      // Pare todas as faixas e defina a posição para 0
      await Promise.all(tracks.map(async ({ soundObject }) => {
        await soundObject.stopAsync();
        await soundObject.setPositionAsync(0);
      }));
      setIsPlaying(false);
      animationRef.stopAnimation(); // Para a animação do cursor
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Erro', `Erro ao parar a faixa: ${error.message}`);
      } else {
        Alert.alert('Erro', 'Erro desconhecido ao parar a faixa');
      }
    }
  };

  const handleVolumeChange = (index: number, volume: number) => {
    const newTracks = [...tracks];
    newTracks[index].volume = volume;
    setTracks(newTracks);
    tracks[index].soundObject.setVolumeAsync(volume);
  };

  const handleMute = (index: number) => {
    const newTracks = [...tracks];
    newTracks[index].isMuted = !newTracks[index].isMuted;
    setTracks(newTracks);
    tracks[index].soundObject.setVolumeAsync(newTracks[index].isMuted ? 0 : newTracks[index].volume);
  };

  const handleSolo = (index: number) => {
    const newTracks = [...tracks];
    newTracks[index].isSolo = !newTracks[index].isSolo;

    // Mute or unmute other tracks based on solo status
    if (newTracks[index].isSolo) {
      newTracks.forEach((track, i) => {
        if (i !== index) {
          track.isMuted = true;
          track.soundObject.setVolumeAsync(0);
        }
      });
    } else {
      const anySolo = newTracks.some((track) => track.isSolo);
      if (!anySolo) {
        newTracks.forEach((track) => {
          track.isMuted = false;
          track.soundObject.setVolumeAsync(track.volume);
        });
      } else {
        newTracks.forEach((track, i) => {
          if (i !== index && !track.isSolo) {
            track.isMuted = true;
            track.soundObject.setVolumeAsync(0);
          }
        });
      }
    }
    setTracks(newTracks);
  };

  // Cálculo do progresso do cursor
  const cursorAnimation = animationRef.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100], // Corrigido para usar valores numéricos
  });

  return (
    <View style={styles.container}>
      {loading ? <Text style={styles.loadingText}>Carregando...</Text> : song && <Text style={styles.songTitle}>{song.title}</Text>}
      {!loading && (
        <View style={styles.waveformContainer}>
          <Svg height="200" width="100%">
            {tracks.map((track, index) => (
              <Line
                key={index}
                x1="0"
                y1={index * 10}
                x2="100%"
                y2={index * 10}
                stroke="grey"
                strokeWidth="2"
              />
            ))}
            <Animated.View
              style={[
                styles.cursor,
                { transform: [{ translateX: cursorAnimation }] }
              ]}
            />
          </Svg>
        </View>
      )}
      <ScrollView style={styles.controlContainer}>
        {tracks.map((track, index) => (
          <View key={index} style={styles.track}>
            <Text style={styles.trackName}>{track.name}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, track.isMuted && styles.muteButton]}
                onPress={() => handleMute(index)}
              >
                <Text style={styles.buttonText}>Mute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  track.isSolo && styles.soloButton,
                ]}
                onPress={() => handleSolo(index)}
              >
                <Text style={[styles.buttonText, track.isSolo && styles.soloButtonText]}>Solo</Text>
              </TouchableOpacity>
            </View>
            <Slider
              style={styles.slider}
              value={track.volume}
              minimumValue={0}
              maximumValue={1}
              onValueChange={(value) => handleVolumeChange(index, value)}
            />
          </View>
        ))}
      </ScrollView>
      {!loading && (
        <View style={styles.controlButtons}>
          <Button title={isPlaying ? 'Pause' : 'Play'} onPress={handlePlayPause} />
          <Button title="Stop" onPress={handleStop} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E2E2E',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  songTitle: {
    color: '#FFF',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  waveformContainer: {
    height: 200,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  cursor: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 2,
    backgroundColor: 'red',
  },
  controlContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  track: {
    backgroundColor: '#333',
    padding: 10,
    margin: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  trackName: {
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#555',
    marginHorizontal: 5,
  },
  muteButton: {
    backgroundColor: 'red',
  },
  soloButton: {
    backgroundColor: 'yellow',
  },
  soloButtonText: {
    color: 'black',
  },
  buttonText: {
    color: '#FFF',
  },
  controlButtons: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default MultitrackScreen;
