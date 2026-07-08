const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profile: {
    displayName: {
      type: String,
      default: function () {
        return this.name;
      },
    },
    profilePic: {
      type: String,
      default: '',
    },
    dob: {
      type: Date,
      default: null,
    },
    educationCentre: {
      type: String,
      default: '',
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  wallet: {
    type: Number,
    default: 1000,
  },
  store: {
    ownedItems: {
      type: [String],
      default: ['classic-clock'],
    },
    equippedItems: {
      Theme: {
        type: String,
        default: '',
      },
      Playlist: {
        type: String,
        default: '',
      },
      Booster: {
        type: String,
        default: '',
      },
      Clock: {
        type: String,
        default: 'classic-clock',
      },
    },
    playlistLimit: {
      type: Number,
      default: 0,
    },
    playlistSongs: {
      type: [String],
      default: [],
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);

