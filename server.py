from flask import Flask, request
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import pandas as pd
import os

app = Flask(__name__)


def restructure_data(features):
	data = {}
	for track in features:
		for attr in track.keys():
			if attr in data:
				data[attr].append(track[attr])
			else:
				data[attr] = []
	return data


def ensure_dir(file_path):
	directory = os.path.dirname(file_path)
	if not os.path.exists(directory):
		os.makedirs(directory)


@app.route('/wordcloud', methods=['POST'])
def wordcloud():
	try:
		data = request.get_json()
		genres_count = data['genres_count']
		display_name = data['display_name']
		id = data['id']
		saved_songs_features = data['saved_songs_features']
		played_songs_features = data['played_songs_features']
		top_songs_features = data['top_songs_features']
		recommended_top_genres_tracks_features = data['recommended_top_genres_tracks_features']
		recommended_top_tracks_features = data['recommended_top_tracks_features']
		filename = "img/wordcloud/%s_%s_word_cloud.png" % (display_name, id)
		print('generating word cloud for %s...' % display_name)

		# print(genres_count)
		# print(saved_songs_features)
		# print(played_songs_features)
		# print(top_songs_features)
		# print(recommended_top_genres_tracks_features)
		# print(recommended_top_tracks_features)

		data_user = restructure_data(saved_songs_features + played_songs_features + top_songs_features)
		df_user = pd.DataFrame(data=data_user)
		# print(df_user)
		df_user.to_csv('csv/%s_user_features.csv' % display_name, encoding='utf-8')
		data_recommended = restructure_data(recommended_top_genres_tracks_features + recommended_top_tracks_features)
		df_recommended = pd.DataFrame(data=data_recommended)
		# print(df_recommended)
		df_recommended.to_csv('csv/%s_recommended_features.csv' % display_name, encoding='utf-8')

		wordcloud = WordCloud(background_color='white', max_font_size=40, collocations=False).generate_from_frequencies(genres_count)
		figure = plt.figure(dpi=300)
		plt.imshow(wordcloud, interpolation="bilinear")
		plt.axis("off")
		# plt.show()
		figure.savefig("views/" + filename, bbox_inches='tight', transparent=True, pad_inches=0, dpi=300)
		return filename
	except Exception as e:
		print(e)
		return None


if __name__ == "__main__":
	ensure_dir('csv/')
	ensure_dir('views/img/wordcloud/')
	print("starting...")
	app.run(port=8080)
