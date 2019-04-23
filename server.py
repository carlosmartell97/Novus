from flask import Flask, request
from wordcloud import WordCloud
import matplotlib.pyplot as plt

app = Flask(__name__)


@app.route('/wordcloud', methods=['POST'])
def wordcloud():
	try:
		data = request.get_json()
		genres_count = data[0]
		display_name = data[1]['display_name']
		filename = "img/" + display_name + "_word_cloud.png"
		print('generating word cloud for %s...' % display_name)

		wordcloud = WordCloud(background_color='white', max_font_size=40, collocations=False).generate_from_frequencies(genres_count)
		figure = plt.figure(dpi=300)
		plt.imshow(wordcloud, interpolation="bilinear")
		plt.axis("off")
		# plt.show()
		figure.savefig("views/" + filename, bbox_inches='tight', transparent=True, pad_inches=0, dpi=300)
		return filename
	except Exception as e:
		print(e)
		return 'error'


if __name__ == "__main__":
	app.run(port=8080)
