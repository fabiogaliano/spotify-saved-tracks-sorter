Version: 1.0.0

ReccoBeats API ==============

Welcome to the ReccoBeats API documentation. This API offers seamless access to an advanced music recommendation system and an extensive music database, enabling developers to integrate personalized music suggestions and track metadata into their applications.

*   [Documentation](https://reccobeats.com/docs/documentation/introduction)

Introduction ============

Overview --------

ReccoBeats is a music recommendation and database API service designed to help developers integrate music suggestions into their applications. By analyzing track data, Reccobeats generates music recommendations tailored to user mood and reference. With a database of over millions songs that is updated regularly, ReccoBeats provide fresh and relevant music data.

The service cluster large dataset of songs, artists, and genres to predict the best recommendations based on track's characteristic.

Key Features ------------

*   **Music Recommendations:** ReccoBeats provides dynamic and precise music recommendations based on song attributes such as energy and mood. *   **Vast Music Library:** With access to over millions songs, ReccoBeats has an extensive music catalog, ensuring a broad spectrum of genres, moods, and artists to recommend from. *   **Real-Time Data and Updates:** ReccoBeats’ database is updated continuously to include the latest songs, albums, and emerging trends, ensuring your recommendations are always current. *   **Customizable Filters:** Developers can apply filters like genre, mood, tempo, and more to fine-tune recommendations to specific user needs or contexts. *   **Advanced Song Metadata:** Each song recommendation includes metadata such as artist name, album name, release date, and track duration. *   **Scalable and Efficient:** The API is designed to handle high traffic and large data volumes, ensuring seamless integration for applications of any size.

Getting Started ---------------

### API Access & Authentication

No API access key or authentication required

### Base URL

The base URL for all ReccoBeats API requests is: [https://api.reccobeats.com](https://api.reccobeats.com)

Contact Information -------------------

For any support, or further information, you can reach us at:

*   **Email**: \[email protected\]

Rate Limiting =============

Overview --------

ReccoBeats enforces rate limits to ensure fair usage and prevent abuse. These rate limits are configured internally.

If you exceed these limits, you'll receive a `429 Too Many Requests` response. Please wait before making further requests.

Best Practices --------------

*   **Caching:** For high-traffic applications, cache recommendations to reduce the number of requests made to the API. *   **Error Handling:** Always include proper error handling to manage API response errors, including rate limiting and invalid requests. *   **Avoid Spam Requests:** Make sure your app doesn't bombard the API with excessive requests in a short period of time, as this may lead to temporary blocking. *   **Retry-After Header:** Checking the Retry-After header to determine the remaining time before making the next request when a 429 error occurs.

Request And Response ====================

Overview --------

The API returns data in JSON format. Each successful request will return a `status` of `"success"`. example response

    {       "id": "8212bab8-5911-48a0-b177-24923ef2329a",       "trackTitle": "Wicked Games",       "artists": [         {           "id": "9451b6b2-8746-4d43-abd7-c355ed1e3048",           "name": "The Weeknd",           "href": "https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ"         }       ],       "durationMs": 325305,       "isrc": "USUM72104140",       "ean": null,       "upc": null,       "href": "https://open.spotify.com/track/00aqkszH1FdUiJJWvX6iEl",       "availableCountries": "AR,AU,AT,BE,BO,BR,BG,CA,CL,CO,CR,CY,CZ,DK,DO,DE,EC,EE,SV,FI,FR,GR,GT,HN,HK,HU,IS,IE,IT,LV,LT,LU,MY,MT,MX,NL,NZ,NI,NO,PA,PY,PE,PH,PL,PT,SG,SK,ES,SE,CH,TW,TR,UY,US,GB,AD,LI,MC,ID,JP,TH,VN,RO,IL,ZA,SA,AE,BH,QA,OM,KW,EG,MA,DZ,TN,LB,JO,PS,IN,BY,KZ,MD,UA,AL,BA,HR,ME,MK,RS,SI,KR,BD,PK,LK,GH,KE,NG,TZ,UG,AG,AM,BS,BB,BZ,BT,BW,BF,CV,CW,DM,FJ,GM,GE,GD,GW,GY,HT,JM,KI,LS,LR,MW,MV,ML,MH,FM,NA,NR,NE,PW,PG,WS,SM,ST,SN,SC,SL,SB,KN,LC,VC,SR,TL,TO,TT,TV,VU,AZ,BN,BI,KH,CM,TD,KM,GQ,SZ,GA,GN,KG,LA,MO,MR,MN,NP,RW,TG,UZ,ZW,BJ,MG,MU,MZ,AO,CI,DJ,ZM,CD,CG,IQ,LY,TJ,VE,ET,XK",       "popularity": 69     }     

### Array Query Parameters

Our API supports two ways to pass arrays in query parameters:

#### 1\. Repeated Query Parameters

    GET /track?ids=1&ids=2&ids=3...     

**Example:**

    https://api.reccobeats.com/v1/track?ids=01K4zKU104LyJ8gMb7227B&ids=0108kcWLnn2HlH2kedi1gn&ids=012gXGNwfkqsXBIhEpE0kl     

#### 2\. Comma-Separated Values (CSV)

    GET /track?ids=1,2,3...     

**Example:**

    https://api.reccobeats.com/v1/track?ids=01K4zKU104LyJ8gMb7227B,0108kcWLnn2HlH2kedi1gn,012gXGNwfkqsXBIhEpE0kl     

HTTP Status & Error Code ------------------------

### HTTP Status Code

The ReccoBeats API uses standard HTTP status codes to indicate the status of your request:

*   **200 OK**: The request was successful. *   **400 Bad Request**: The request was malformed or contains invalid parameters. *   **403 Forbidden**: The API key doesn’t have permissions to perform the request. *   **429 Too Many Requests**: You have exceeded the rate limit for requests. *   **500 Internal Server Error**: An unexpected error occurred on the server.

#### Error Code

Code

Exception

Info

4001

MissingServletRequestParameterException

The request was missing required parameters.

4002

BadRequestException

The request was malformed or contains invalid parameters.

4003

DateTimeParseException

The request contains invalid datetime format.

4004

ConstraintViolationException

Validation exception for parameters value.

4041

ResourceNotFoundException

Cannot find the entity given ID in the request.

4042

NoResourceFoundException

URL path is incorrect or not exist.

4291

TooManyRequestException

You have exceeded the rate limit for requests.

4032

AccessDeniedException

Account not exist.

4031

InactiveAccountException

Account is inactive.

4011

PasswordIncorrect

Incorrect username or password.

5001

UnknownException

Unknown internal server error.

Error Handle ------------

### Common Error Response:

    {       "timestamp": "2025-01-12T07:09:10.228+00:00",       "error": "Size must be a greater than zero",       "path": "uri=/v1/track/recommendation",       "status": 4002     }     

#### Attributes

##### `timestamp` _required_

The time when the error occurred.

##### `error` _required_

A message describing the error.

##### `path` _required_

The URL path where the error occurred.

##### `status` _required_

A unique [code](#error-code) identifying the error.

### Validation Error Response

    {       "status": 4004,       "errors": [         {           "path": "getRecommendation.size",           "message": "must be less than or equal to 100"         }       ]     }     

#### Attributes

##### `status` _required_

A unique [code](#error-code) identifying the error.

> Validation error code is always 4004

##### `errors` _required_

List of validation errors

##### `errors[].path` _required_

Name of invalid parameter

##### `errors[].message` _required_

Error message detail

Audio Feature Extraction ========================

The Audio Feature Extraction API allows users to upload an audio file and extract detailed audio features such as acousticness, danceability, energy, and more. This API is useful for music analysis, recommendation systems, and audio processing applications.

Request and Response --------------------

Extracts a variety of audio features from an uploaded audio file.

### Request

*   **Method:** `POST` *   **URL:** `/v1/analysis/audio-features` *   **Full URL:** `https://api.reccobeats.com/v1/analysis/audio-features`

#### Headers

Name

Type

Required

Description

`Content-Type`

String

Yes

Must be `multipart/form-data` for file uploads

#### Body Parameters

Name

Type

Required

Description

`audioFile`

Binary

Yes

The audio file to upload. Maximum file size: 5MB

#### Supported Audio Formats

*   MP3 *   OGG *   Vorbis *   AIFF/AIFC *   WAV

* * *

### Response

#### Success Response

*   **Status Code:** `200 OK` *   **Content-Type:** `application/json`

##### Response Body

    {       "acousticness": 0.174,       "danceability": 0.4004,       "energy": 0.6899,       "instrumentalness": 0.0309,       "liveness": 0.1188,       "loudness": -6.0411,       "speechiness": 0.0566,       "tempo": 147.7849,       "valence": 0.2747     }     

Field

Type

Description

`acousticness`

Float

Confidence (0.0 to 1.0) that the track is acoustic. Higher values indicate more natural sounds.

`danceability`

Float

Suitability for dancing (0.0 to 1.0). Higher values indicate more rhythmically engaging tracks.

`energy`

Float

Intensity and liveliness (0.0 to 1.0). Higher values indicate more energetic tracks.

`instrumentalness`

Float

Likelihood of no vocals (0.0 to 1.0). Values above 0.5 suggest instrumental tracks.

`liveness`

Float

Probability of a live audience (0.0 to 1.0). Values above 0.8 strongly suggest a live track.

`loudness`

Float

Average loudness in decibels (dB). Typically ranges between -60 and 0 dB.

`speechiness`

Float

Presence of spoken words (0.0 to 1.0). Values above 0.66 indicate mostly speech.

`tempo`

Float

Estimated tempo in beats per minute (BPM). Typically ranges between 0 and 250.

`valence`

Float

Emotional tone (0.0 to 1.0). Higher values indicate a happier mood, lower values a sadder one.

#### Error Response

*   **Status Code:** `400 Bad Request` *   **Content-Type:** `application/json`

##### Response Body

    {       "timestamp": "2025-03-26T17:06:19.870+00:00",       "error": "Unsupported file type",       "path": "uri=/v1/analysis/audio-features",       "status": 4002     }     

Field

Type

Description

`error`

String

Short error description

`message`

String

Detailed error explanation

* * *

### Example

#### Request Example (cURL)

    curl -X POST http://localhost:3000/v1/analysis/audio-features \       -H "Content-Type: multipart/form-data" \       -F "audioFile=@/path/to/your/audio.mp3"     

#### Response Example

    {       "acousticness": 0.3287,       "danceability": 0.4065,       "energy": 0.6529,       "instrumentalness": 0.0269,       "liveness": 0.131,       "loudness": -6.5329,       "speechiness": 0.0493,       "tempo": 140.7761,       "valence": 0.3396     }     

* * *

Constraints -----------

*   **Maximum File Size:** 5MB *   **Supported Formats:** MP3, OGG, Vorbis, AIFF/AIFC, WAV *   **Maximum audio length:** 30 seconds (audio beyond 30 seconds will be truncated)

> info To analyze audio longer than 30 seconds, you can divide it into multiple files, extract features from each, and then compute the average of the extracted values. The recommended audio sampling rate is 44,100 Hz, however, the model is designed to support multiple sampling rates.

* * *

Status Codes ------------

Code

Description

`200`

Successful response

`400`

Bad request (e.g., Unsupported file type)

`415`

Bad request (e.g., Content-Type 'null' is not supported.)

* * *

Album =====

### **Album Resource**

An Album represents a collection of tracks released by one or many artists.

> info >  > *   Can have multiple **tracks**. > *   Can belong to multiple **artists**.

### **Attributes:**

Attribute

Type

Description

**id**

string

Unique ID for the album

**albumType**

string

The type of the album. Allowed values: `album`, `single`, `compilation`

**artists**

object\[\]

List of artists associated with the album

**totalTracks**

integer

Total number of tracks in the album

**href**

string

Known Spotify URLs for this album

**name**

string

Name of the album

**availableCountries**

string

List of available countries for this album, identified by their ISO 3166-1 alpha-2 code. Separated by commas (Optional)

**releaseDate**

string

The date the album was first released (Optional)

**releaseDateFormat**

string

The precision with which `releaseDate` value is known. Allowed values: `day (YYYY-MM-DD)`, `month (MM-DD)`, `year (YYYY)`

**isrc**

string

International Standard Recording Code (Optional)

**ean**

string

European Article Number (Optional)

**upc**

string

Universal Product Code (Optional)

**label**

string

The label associated with the album

**popularity**

integer

The popularity of the album, ranging from 0 to 100, with 100 being the most popular

### **Album Example:**

    {       "id": "2670c328-c40f-45f4-80df-f48b29296deb",       "albumType": "album",       "artists": [         {           "id": "c7b330b5-a62e-420c-bf02-943ca6bb8746",           "name": "Taylor Swift",           "href": "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02"         }       ],       "totalTracks": 46,       "href": "https://open.spotify.com/album/1MPAXuTVL2Ej5x0JHiSPq8",       "name": "reputation Stadium Tour Surprise Song Playlist",       "availableCountries": "AR,AU,AT,BE,BO,BR,BG,CA,CL,CO,CR,CY,CZ,DK,DO,DE,EC,EE,SV,FI,FR,GR,GT,HN,HK,HU,IS,IE,IT,LV,LT,LU,MY,MT,MX,NL,NZ,NI,NO,PA,PY,PE,PH,PL,PT,SG,SK,ES,SE,CH,TW,TR,UY,US,GB,AD,LI,MC,ID,JP,TH,VN,RO,IL,ZA,SA,AE,BH,QA,OM,KW,EG,MA,DZ,TN,LB,JO,PS,IN,BY,KZ,MD,UA,AL,BA,HR,ME,MK,RS,SI,KR,BD,PK,LK,GH,KE,NG,TZ,UG,AG,AM,BS,BB,BZ,BT,BW,BF,CV,CW,DM,FJ,GM,GE,GD,GW,GY,HT,JM,KI,LS,LR,MW,MV,ML,MH,FM,NA,NR,NE,PW,PG,WS,SM,ST,SN,SC,SL,SB,KN,LC,VC,SR,TL,TO,TT,TV,VU,AZ,BN,BI,KH,CM,TD,KM,GQ,SZ,GA,GN,KG,LA,MO,MR,MN,NP,RW,TG,UZ,ZW,BJ,MG,MU,MZ,AO,CI,DJ,ZM,CD,CG,IQ,LY,TJ,VE,ET,XK",       "releaseDate": "2017-11-09",       "releaseDateFormat": "day",       "isrc": null,       "ean": null,       "upc": "00843930039371",       "label": "Big Machine Records, LLC",       "popularity": 68     }

Artist ======

### **Artist Resource**

Represents a musical artist, can be single artist or multiple artist collaboration.

*   Can have multiple **albums**. *   Can have multiple **tracks**.

### **Attributes:**

Attribute

Type

Description

id

string

Unique id for artist

name

string

Artist's name

href

string

Known spotify URLs for this artist.

### **Artist Example:**

    {       "id": "c7b330b5-a62e-420c-bf02-943ca6bb8746",       "name": "Taylor Swift",       "href": "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02"     }

    # Resource ID          ## **Resource ID Description**          A Resource ID is a unique identifier assigned to each entity within the API, such as an Artist, Album, or Track. It is used to uniquely reference a specific resource when making API requests.          ### **1. Reccobeats ID**          - A **hash-based UUID (Universally Unique Identifier)** assigned internally by the Reccobeats system.     - It follows the **UUID v4 format**, which consists of 32 hexadecimal characters separated by hyphens.     - Used for **internal referencing and database management** within Reccobeats.     - **Example:** `2670c328-c40f-45f4-80df-f48b29296deb`          ### **2. Spotify ID**          - A **Base-62 encoded string** used by Spotify to uniquely identify a resource.     - Found at the end of the Spotify URL (Example: open.spotify.com/artist/**06HL4z0CvFAxyc27GXpf02**)     - Used for **searching multiple resource**.     - **Example:** `06HL4z0CvFAxyc27GXpf02`          ## **Usage in API Requests**          When interacting with API endpoints, both Reccobeats ID and Spotify ID may be used depending on the context.          - Fetching a track detail by **ID** we must use **ReccoBeats ID**:          ```text     GET /track/878dadea-33c5-4c08-bdb9-e2b117475a99     

*   Retrieving multiple tracks by **IDs** supports both **ReccoBeats IDs** and **Spotify IDs**:

    GET /track?ids=00vJzaoxM3Eja1doBUhX0P&ids=2670c328-c40f-45f4-80df-f48b29296deb     

*   Get track recommendation supports both **ReccoBeats IDs** and **Spotify IDs**:

    GET /track/recommendation?seeds=00vJzaoxM3Eja1doBUhX0P&seeds=2670c328-c40f-45f4-80df-f48b29296deb&size=10

Track =====

Track Resource --------------

A Track represents an individual song or musical piece performed by artists and typically belongs to one or many album.

*   Can belong to multiple **albums**. *   Can belong to multiple **artists**.

Attributes: -----------

Attribute

Type

Description

**id**

string

Unique ID for the track

**trackTitle**

string

Name of the track

**artists**

object\[\]

List of artists associated with the track

**durationMs**

integer

Duration of the track in milliseconds

**isrc**

string

International Standard Recording Code (Optional)

**ean**

string

European Article Number (Optional)

**upc**

string

Universal Product Code (Optional)

**href**

string

Known Spotify URLs for this track

**availableCountries**

string

List of available countries for this track, identified by their ISO 3166-1 alpha-2 code. Separated by commas (Optional)

**popularity**

integer

The popularity of the track, ranging from 0 to 100, with 100 being the most popular

Track Example: --------------

    {       "id": "878dadea-33c5-4c08-bdb9-e2b117475a99",       "trackTitle": "All Too Well",       "artists": [         {           "id": "c7b330b5-a62e-420c-bf02-943ca6bb8746",           "name": "Taylor Swift",           "href": "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02"         }       ],       "durationMs": 329160,       "isrc": "USCJY1231021",       "ean": null,       "upc": null,       "href": "https://open.spotify.com/track/00vJzaoxM3Eja1doBUhX0P",       "availableCountries": "AR,AU,AT,BE,BO,BR,BG,CA,CL,CO,CR,CY,CZ,DK,DO,DE,EC,EE,SV,FI,FR,GR,GT,HN,HK,HU,IS,IE,IT,LV,LT,LU,MY,MT,MX,NL,NZ,NI,NO,PA,PY,PE,PH,PL,PT,SG,SK,ES,SE,CH,TW,TR,UY,US,GB,AD,LI,MC,ID,JP,TH,VN,RO,IL,ZA,SA,AE,BH,QA,OM,KW,EG,MA,DZ,TN,LB,JO,PS,IN,BY,KZ,MD,UA,AL,BA,HR,ME,MK,RS,SI,KR,BD,PK,LK,GH,KE,NG,TZ,UG,AG,AM,BS,BB,BZ,BT,BW,BF,CV,CW,DM,FJ,GM,GE,GD,GW,GY,HT,JM,KI,LS,LR,MW,MV,ML,MH,FM,NA,NR,NE,PW,PG,WS,SM,ST,SN,SC,SL,SB,KN,LC,VC,SR,TL,TO,TT,TV,VU,AZ,BN,BI,KH,CM,TD,KM,GQ,SZ,GA,GN,KG,LA,MO,MR,MN,NP,RW,TG,UZ,ZW,BJ,MG,MU,MZ,AO,CI,DJ,ZM,CD,CG,IQ,LY,TJ,VE,ET,XK",       "popularity": 34     }

