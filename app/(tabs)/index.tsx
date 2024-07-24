// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Song } from '@/types';  // Certifique-se de ajustar o caminho conforme necessário

const HomeScreen = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchSongs = async () => {
      const response = await fetch('https://drive.google.com/uc?export=download&id=1qFBZj9dPllscIrgvYkqXVsxLD5zaFHgX'); // Substitua pela URL do seu arquivo JSON
      const data: Song[] = await response.json();
      setSongs(data);
    };
    fetchSongs();
  }, []);

  // Configuração do modo de áudio
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: 1,  // Valor correspondente ao modo do iOS que não mistura
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1,  // Valor correspondente ao modo do Android que não mistura
      playThroughEarpieceAndroid: false,
    });
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/multitrack/${item.id}`)}>
            <Text>{item.title}</Text>
          </TouchableOpacity>
        )}
        initialNumToRender={10} // Número inicial de itens a serem renderizados
        onEndReached={() => console.log('Reached end')} // Função opcional para carregar mais itens
        onEndReachedThreshold={0.5} // Distância do final da lista para acionar onEndReached
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20, // Ajuste a margem superior conforme necessário
    paddingHorizontal: 10, // Adiciona padding horizontal para melhor visualização
  },
  list: {
    paddingBottom: 20, // Adiciona padding inferior para evitar que o último item fique muito perto da borda inferior
  },
  item: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
});

export default HomeScreen;
