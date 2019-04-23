# Novus
Personalized music recommendations.

## Install
```
npm install
pip install -r requirements.txt
```

## Usage
Create a file called **.env** with your own following values:
```
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=your-spotify-redirect-url
PORT=your-port
```
Then...
```
python server.py
```
Leave that running. Now, in another terminal...
```
npm start
```
And finally, site is now running at http://localhost:your-port
