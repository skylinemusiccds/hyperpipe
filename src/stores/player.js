import { reactive } from 'vue';
import { defineStore } from 'pinia';

import { getJsonPiped, getJsonHyp } from '@/scripts/fetch.js';
import { useStore, useMetadata } from '@/scripts/util.js';

const store = useStore();

export const useData = defineStore('data', () => {
  const state = reactive({
    title: '',
    description: '',
    artist: '',
    art: '',
    url: '',
    artistUrl: '',
    lyrics: '',
    src: [],
    urls: [],
  });

  const player = usePlayer();

  async function getSong(e) {
    console.log(e);

    const hash = new URLSearchParams(e.substring(e.indexOf('?'))).get('v'),
      json = await getJsonPiped('/streams/' + hash);

    console.log(json);

    state.art = json.thumbnailUrl;
    state.description = json.description;
    state.title = json.title;
    state.artist = json.uploader.replace(' - Topic', '');
    state.artistUrl = json.uploaderUrl;
    player.state.duration = json.duration;
    player.state.hls = json.hls;
    player.state.streams = json.audioStreams;
    state.url = e;

    await getNext(hash);
  }

  async function getNext(hash) {
    if (
      store.getItem('next') !== 'false' &&
      (!state.urls ||
        !state.urls.filter(s => s.url == state.url)[0] ||
        state.urls.length == 1)
    ) {
      const json = await getJsonHyp('/next/' + hash);

      state.lyrics = json.lyricsId;

      state.url = json.songs[0]
        ? '/watch?v=' + json.songs[0].id
        : '/watch?v=' + hash;

      console.log(json);

      state.urls =
        json.songs.length > 0
          ? json.songs.map(i => ({
              ...i,
              ...{
                url: '/watch?v=' + i.id,
                id: undefined,
              },
            }))
          : state.urls;

      useMetadata(state.url, state.urls, {
        title: state.title,
        artist: state.artist,
        art: state.art,
      });

      console.log(state.urls);
    } else {
      if (state.urls.length == 0) {
        state.urls = [
          {
            title: state.title,
            url: state.url,
          },
        ];
      }

      useMetadata(state.url, state.urls, {
        title: state.title,
        artist: state.artist,
        art: state.art,
      });
    }
  }

  function playNext(u) {
    const now = state.urls.filter(s => s.url === state.url)[0],
      i = state.urls.indexOf(now),
      next = state.urls[i + 1];

    console.log('Index: ' + i);
    console.log(state.url, state.urls, next);

    if (state.urls.length > i && state.urls.length != 0 && next) {
      getSong(next.url);
    } else if (player.state.loop) {
      console.log(state.url, state.urls[0]);
      state.url = state.urls[0].url;
      getSong(state.urls[0].url);
    } else {
      state.urls = [];
    }
  }

  return { state, getSong, playNext };
});

export const usePlayer = defineStore('player', () => {
  const state = reactive({
    loop: false,
    play: false,
    status: 'play',
    hls: '',
    streams: [],
    duration: 0,
    time: 0,
    currentTime: 0,
    playlist: false,
    lyrics: false,
    info: false,
    vol: store.vol ? store.vol / 100 : 1,
  });

  function toggle(i) {
    console.log(i, state[i]);
    if (typeof state[i] == 'boolean') {
      state[i] = !state[i];
    }
    console.log(i, state[i]);
  }

  function setTime(t) {
    state.time = Math.floor((t / state.duration) * 100);
  }

  return { state, toggle, setTime };
});