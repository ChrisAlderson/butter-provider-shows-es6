'use strict';

const Provider = require('butter-provider');
const request = require('request');
const sanitize = require('butter-sanitize');

class TVShowApi extends Provider {

  constructor(args) {
    super(args);

    if (!(this instanceof TVShowApi)) return new TVShowApi(args);

    this.apiURL = this.args.apiURL;
  }

  _formatDetail(show) {
    return {
      imdb_id: show.imdb_id,
      title: show.title,
      year: show.year,
      genres: show.genres,
      rating: parseInt(show.rating.percentage, 10) / 10,
      poster: show.images.poster,
      type: Provider.ItemType.TVSHOW,
      num_seasons: show.num_seasons,
      runtime: show.runtime,
      backdrop: show.images.fanart,
      synopsis: show.synopsis,
      subtitle: {},
      status: show.status,
      episodes: show.episodes
    };
  }

  _formatFetch(shows) {
  	const results = shows.map(show => {
      return {
        imdb_id: show.imdb_id,
        title: show.title,
        year: show.year,
        genres: show.genres,
        rating: parseInt(show.rating.percentage, 10) / 10,
        poster: show.images.poster,
        type: Provider.ItemType.TVSHOW,
        num_seasons: show.num_seasons
      };
    });

  	return {
  		results: sanitize(results),
  		hasMore: true
  	};
  }

  _processCloudFlareHack(options, url) {
  	const match = url.match(/^cloudflare\+(.*):\/\/(.*)/);
  	if (match) {
  		options = Object.assign(options, {
  			uri: `${match[1]}://cloudflare.com/`,
  			headers: {
  				'Host': match[2],
  				'User-Agent': 'Mozilla/5.0 (Linux) AppleWebkit/534.30 (KHTML, like Gecko) PT/3.8.0'
  			}
  		});
  	}
  	return options;
  }

  _get(index, url, qs) {
    return new Promise((resolve, reject) => {
      const options = {
        url: url,
        json: true,
        qs
      };

      const req = this._processCloudFlareHack(options, this.apiURL[index]);
      return request.get(req, (err, res, data) => {
        if (err || res.statusCode >= 400) {
          if (index + 1 >= this.apiURL.length) {
            return reject(err || new Error('Status Code is above 400'));
          } else {
            return resolve(this._get(index++, url));
          }
        } else if (!data || data.error) {
          err = data ? data.status_message : 'No data returned';
          return reject(new Error(err));
        } else {
          return resolve(data);
        }
      });
    });
  }

  extractId(items) {
  	return items.results.map(item => item[TVShowApi.prototype.config.uniqueId]);
  }

  fetch(filters, index = 0) {
    const params = {};

    if (filters.keywords) params.keywords = filters.keywords.replace(/\s/g, '% ');
    if (filters.genre) params.genre = filters.genre;
    if (filters.order) params.order = filters.order;
    if (filters.sorter && filters.sorter !== 'popularity') params.sort = filters.sorter;

    filters.page = filters.page ? filters.page : 1;

    const url = `${this.apiURL[index]}shows/${filters.page}`;
    return this._get(index, url, params).then(data => this._formatFetch(data));
  }

  detail(torrent_id, old_data, debug, index = 0) {
    const url = `${this.apiURL[index]}show/${torrent_id}`;
    return this._get(index, url).then(data => this._formatDetail(data));
  }

  random(index = 0) {
    const url = `${this.apiURL[index]}random/show`;
    return this._get(index, url).then(data => this._formatDetail(data));
  }

}

TVShowApi.prototype.config = {
  name: 'TVShowApi',
  uniqueId: 'imdb_id',
  tabName: 'TVShowApi',
  filters: {
    sorters: {
      trending: 'Trending',
      popularity: 'Popularity',
      updated: 'Updated',
      year: 'Year',
      name: 'Name',
      rating: 'Rating'
    },
    genres: {
      all: 'All',
      action: 'Action',
      adventure: 'Adventure',
      animation: 'Animation',
      comedy: 'Comedy',
      crime: 'Crime',
      disaster: 'Disaster',
      documentary: 'Documentary',
      drama: 'Drama',
      eastern: 'Eastern',
      family: 'Family',
      'fan-film': 'Fan-Film',
      fantasy: 'Fantasy',
      'film-noir': 'Film-Noir',
      history: 'History',
      holiday: 'Holiday',
      horror: 'Horror',
      indie: 'Indie',
      music: 'Music',
      mystery: 'Mystery',
      none: 'None',
      road: 'Road',
      romance: 'Romance',
      'science-fiction': 'Science-Fiction',
      short: 'Short',
      sports: 'Sports',
      'sporting-event': 'Sporting-Event',
      suspense: 'Suspense',
      thriller: 'Thriller',
      'tv-movie': 'TV-Movie',
      war: 'War',
      western: 'Western'
    }
  },
  defaults: {
    apiURL: [
      'https://tv-v2.api-fetch.website/',
      'cloudflare+https://tv-v2.api-fetch.website/'
    ]
  },
  args: {
    apiURL: Provider.ArgType.ARRAY
  }
}

module.exports = TVShowApi;
