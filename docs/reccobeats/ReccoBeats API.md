# ReccoBeats API Documentation

**Version**: 1.0.0

Welcome to the ReccoBeats API documentation. This API offers seamless access to an advanced music recommendation system and an extensive music database, enabling developers to integrate personalized music suggestions and track metadata into their applications.

**Base URL**: `https://api.reccobeats.com`

---

## Track

### Track Recommendation

`GET /v1/track/recommendation`

Track recommendation.

#### Query Parameters

*   `size` (integer, required): Total return tracks.
    *   **Possible values**: `>= 1` and `<= 100`
*   `seeds` (string[], required): List of Track's ReccoBeats ID or Spotify ID.
    *   **Possible values**: `>= 1`, `<= 5`
*   `negativeSeeds` (string[]): List of Track's ReccoBeats ID or Spotify ID that the user wants to avoid or dislikes. This parameter works in contrast to seeds.
    *   **Possible values**: `>= 1`, `<= 5`
*   `acousticness` (float): Acousticness refers to how much of a song or piece of music is made up of natural, organic sounds rather than synthetic or electronic elements. In other words, it's a measure of how "acoustic" a piece of music sounds. A confidence measure from 0.0 to 1.0, greater value represents higher confidence the track is acoustic.
    *   **Possible values**: `>= 0` and `<= 1`
*   `danceability` (float): Danceability is a measure of how suitable a song is for dancing, ranging from 0 to 1. A score of 0 means the song is not danceable at all, while a score of 1 indicates it is highly danceable. This score takes into account factors like tempo, rhythm, beat consistency, and energy, with higher scores indicating stronger, more rhythmically engaging tracks.
    *   **Possible values**: `>= 0` and `<= 1`
*   `energy` (float): Energy in music refers to the intensity and liveliness of a track, with a range from 0 to 1. A score of 0 indicates a very calm, relaxed, or low-energy song, while a score of 1 represents a high-energy, intense track. It’s influenced by elements like tempo, loudness, and the overall drive or excitement in the music.
    *   **Possible values**: `>= 0` and `<= 1`
*   `instrumentalness` (float): Predicts whether a track contains no vocals. “Ooh” and “aah” sounds are treated as instrumental in this context. Rap or spoken word tracks are clearly “vocal”. The closer the instrumentalness value is to 1.0, the greater likelihood the track contains no vocal content. Values above 0.5 are intended to represent instrumental tracks, but confidence is higher as the value approaches 1.0.
    *   **Possible values**: `>= 0` and `<= 1`
*   `key` (integer): The key the track is in. Integers map to pitches using standard Pitch Class notation. E.g. 0 = C, 1 = C♯/D♭, 2 = D, and so on. If no key was detected, the value is -1.
    *   **Possible values**: `>= -1` and `<= 11`
*   `liveness` (float): Detects the presence of an audience in the recording. Higher liveness values represent an increased probability that the track was performed live. A value above 0.8 provides strong likelihood that the track is live.
    *   **Possible values**: `>= 0` and `<= 1`
*   `loudness` (float): The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track and are useful for comparing relative loudness of tracks. Loudness is the quality of a sound that is the primary psychological correlate of physical strength (amplitude). Values typical range between -60 and 0 db.
    *   **Possible values**: `>= -60` and `<= 2`
*   `mode` (integer): Mode indicates the modality (major or minor) of a track. Major is represented by 1 and minor is 0.
    *   **Possible values**: `>= 0` and `<= 1`
*   `speechiness` (float): Speechiness detects the presence of spoken words in a track. The more exclusively speech-like the recording (e.g. talk show, audio book, poetry), the closer to 1.0 the attribute value. Values above 0.66 describe tracks that are probably made entirely of spoken words. Values between 0.33 and 0.66 describe tracks that may contain both music and speech, either in sections or layered, including such cases as rap music. Values below 0.33 most likely represent music and other non-speech-like tracks.
    *   **Possible values**: `>= 0` and `<= 1`
*   `tempo` (float): Estimated tempo in beats per minute (BPM). Typically ranges between 0 and 250.
    *   **Possible values**: `>= 0` and `<= 250`
*   `valence` (float): Valence in music measures the emotional tone or mood of a track, with a range from 0 to 1. A score of 0 indicates a song with a more negative, sad, or dark feeling, while a score of 1 represents a more positive, happy, or uplifting mood. Tracks with a high valence tend to feel joyful or energetic, while those with a low valence may evoke feelings of melancholy or sadness.
    *   **Possible values**: `>= 0` and `<= 1`
*   `popularity` (integer): The popularity of the track. The value will be between 0 and 100, with 100 being the most popular.
    *   **Possible values**: `>= 0` and `<= 100`
*   `featureWeight` (float): Scales the influence of audio feature queries by multiplying each feature before averaging.
    *   **Possible values**: `>= 1` and `<= 5`

#### Responses

**200 OK**

`application/json`

```json
[
  {
    "id": "string",
    "trackTitle": "string",
    "artists": "object[]",
    "durationMs": "integer",
    "isrc": "string",
    "ean": "string",
    "upc": "string",
    "href": "string",
    "availableCountries": "string",
    "popularity": "integer"
  }
]
```

**400 Bad Request**

#### Example (axios)

```javascript
const axios = require('axios');

let config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: 'https://api.reccobeats.com/v1/track/recommendation',
  headers: {
    'Accept': 'application/json'
  }
};

axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });
```

---

### Get Track Detail

`GET /v1/track/:id`

Get track detail.

#### Path Parameters

*   `id` (string, required): Track ID.

#### Responses

**200 OK**

`application/json`

```json
{
  "id": "string",
  "trackTitle": "string",
  "artists": "object[]",
  "durationMs": "integer",
  "isrc": "string",
  "ean": "string",
  "upc": "string",
  "href": "string",
  "availableCountries": "string",
  "popularity": "integer"
}
```

**400 Bad Request**

**404 Not Found**

---

### Get Multiple Tracks

`GET /v1/track`

Get multiple tracks.

#### Query Parameters

*   `ids` (string[], required): List of Track's ReccoBeats ID or Spotify ID.
    *   **Possible values**: `>= 1`, `<= 40`

#### Responses

**200 OK**

`application/json`

```json
[
  {
    "id": "string",
    "trackTitle": "string",
    "artists": [
      {
        "id": "string",
        "name": "string",
        "href": "string"
      }
    ],
    "durationMs": "integer",
    "isrc": "string",
    "ean": "string",
    "upc": "string",
    "href": "string",
    "availableCountries": "string",
    "popularity": "integer"
  }
]
```

**400 Bad Request**

---

### Get Track's Album

`GET /v1/track/:id/album`

Track usually belongs to one album but also it can belong to multiple albums.

#### Path Parameters

*   `id` (string, required): Track ID.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {
      "id": "string",
      "albumType": "string",
      "artists": "object[]",
      "totalTracks": "integer",
      "href": "string",
      "name": "string",
      "availableCountries": "string",
      "releaseDate": "string",
      "releaseDateFormat": "string",
      "isrc": "string",
      "ean": "string",
      "upc": "string",
      "label": "string",
      "popularity": "integer"
    }
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

**404 Not Found**

---

### Get Track's Audio Features

`GET /v1/track/:id/audio-features`

Get track's audio features.

#### Path Parameters

*   `id` (string, required): ReccoBeats's Track ID.

#### Responses

**200 OK**

`application/json`

```json
{
  "id": "string",
  "acousticness": "float",
  "danceability": "float",
  "energy": "float",
  "instrumentalness": "float",
  "liveness": "float",
  "loudness": "float",
  "speechiness": "float",
  "tempo": "float",
  "valence": "float"
}
```

**400 Bad Request**

**404 Not Found**

---

## Artist

### Get Artist Detail

`GET /v1/artist/:id`

Get artist detail.

#### Path Parameters

*   `id` (string, required): Artist ID.

#### Responses

**200 OK**

`application/json`

```json
{
  "id": "string",
  "name": "string",
  "href": "string"
}
```

**400 Bad Request**

**404 Not Found**

---

### Get Multiple Artists

`GET /v1/artist`

Get multiple artists.

#### Query Parameters

*   `ids` (string[], required): List of Artist's ReccoBeats ID or Spotify ID.
    *   **Possible values**: `>= 1`, `<= 40`

#### Responses

**200 OK**

`application/json`

```json
[
  {
    "id": "string",
    "name": "string",
    "href": "string"
  }
]
```

**400 Bad Request**

---

### Search Artist

`GET /v1/artist/search`

Search artist.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`
*   `searchText` (string, required): Searching by artist name.
    *   **Possible values**: non-empty and `<= 1000` characters

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {
      "id": "string",
      "name": "string",
      "href": "string"
    }
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

---

### Get Artist's Album

`GET /v1/artist/:id/album`

Get artist's album.

#### Path Parameters

*   `id` (string, required): Artist ID.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {
      "id": "string",
      "albumType": "string",
      "artists": "object[]",
      "totalTracks": "integer",
      "href": "string",
      "name": "string",
      "availableCountries": "string",
      "releaseDate": "string",
      "releaseDateFormat": "string",
      "isrc": "string",
      "ean": "string",
      "upc": "string",
      "label": "string",
      "popularity": "integer"
    }
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

**404 Not Found**

---

### Get Artist's Track

`GET /v1/artist/:id/track`

Get artist's track.

#### Path Parameters

*   `id` (string, required): Artist ID.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {
      "id": "string",
      "trackTitle": "string",
      "artists": "object[]",
      "durationMs": "integer",
      "isrc": "string",
      "ean": "string",
      "upc": "string",
      "href": "string",
      "availableCountries": "string",
      "popularity": "integer"
    }
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

**404 Not Found**

---

## Album

### Get Album Detail

`GET /v1/album/:id`

Get album detail.

#### Path Parameters

*   `id` (string, required): Album ID.

#### Responses

**200 OK**

`application/json`

```json
{
  "id": "string",
  "albumType": "string",
  "artists": "object[]",
  "totalTracks": "integer",
  "href": "string",
  "name": "string",
  "availableCountries": "string",
  "releaseDate": "string",
  "releaseDateFormat": "string",
  "isrc": "string",
  "ean": "string",
  "upc": "string",
  "label": "string",
  "popularity": "integer"
}
```

**400 Bad Request**

**404 Not Found**

---

### Get Multiple Albums

`GET /v1/album`

Get multiple albums.

#### Query Parameters

*   `ids` (string[], required): List of Album's ReccoBeats ID or Spotify ID.
    *   **Possible values**: `>= 1`, `<= 40`

#### Responses

**200 OK**

`application/json`

```json
[
  {}
]
```

**400 Bad Request**

**404 Not Found**

---

### Get Album's Track

`GET /v1/album/:id/track`

Get album's track.

#### Path Parameters

*   `id` (string, required): Album ID.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {
      "id": "string",
      "trackTitle": "string",
      "artists": "object[]",
      "durationMs": "integer",
      "isrc": "string",
      "ean": "string",
      "upc": "string",
      "href": "string",
      "availableCountries": "string",
      "popularity": "integer"
    }
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

**404 Not Found**

---

### Search Album

`GET /v1/album/search`

Search album.

#### Query Parameters

*   `page` (integer): Page number, start with 0.
    *   **Possible values**: `>= 0` and `<= 1000`
    *   **Default value**: `0`
*   `size` (integer): Total elements per page.
    *   **Possible values**: `>= 1` and `<= 50`
    *   **Default value**: `25`
*   `searchText` (string, required): Searching by album name.
    *   **Possible values**: non-empty and `<= 1000` characters

#### Responses

**200 OK**

`application/json`

```json
{
  "content": [
    {}
  ],
  "page": "int32",
  "size": "int32",
  "totalElements": "int64",
  "totalPages": "int32"
}
```

**400 Bad Request**

---

## Analysis

### Extract Audio Features

`POST /v1/analysis/audio-features`

Extract audio features from audio source. Checkout document for more details.

#### Request Body (multipart/form-data)

*   `audioFile` (binary, required): The audio file to upload (e.g., WAV, MP3). Maximum 5MB.

#### Responses

**200 OK**

`application/json`

```json
{
  "acousticness": "float",
  "danceability": "float",
  "energy": "float",
  "instrumentalness": "float",
  "liveness": "float",
  "loudness": "float",
  "speechiness": "float",
  "tempo": "float",
  "valence": "float"
}
```

**400 Bad Request**