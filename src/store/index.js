import { createStore } from 'vuex'
import { get } from 'lodash'

export default createStore({
  state () {
    return {
      address: {
        host: 'localhost',
        port: 1229,
        tls: false,
      },
      enable: false,
      clientId: '',
      stateMsg: '正在连接...',
    }
  },
  mutations: {
    updateState (state, message) {
      state.stateMsg = message
    },
    updateAddress (state, address) {
      state.address = address
    },
    updateClient (state, clientId) {
      state.clientId = clientId
    },
    setEnable (state, enable) {
      state.enable = enable
    }
  },
  actions: {
    async loadStorageData ({ commit, dispatch }) {
      commit('updateClient', localStorage.getItem('client_id'))
      commit('setEnable', localStorage.getItem('enable') === 'true')
      await dispatch('syncStatusMessage')
      await dispatch('readStorageAddress')
    },
    saveStorageData ({ state }) {
      localStorage.setItem('address', JSON.stringify(state.address));
      localStorage.setItem('client_id', state.clientId);
      localStorage.setItem('enable', state.enable);
    },
    syncStatusMessage ({ commit }) {
      commit('updateState', localStorage.getItem('status_message') || '无状态')
    },
    readStorageAddress ({ commit }) {
      const conn = {}
      const tmpValue = localStorage.getItem('address')
      let data = {}
      try {
        if (tmpValue) {
          data = JSON.parse(tmpValue);
        }
      } finally {
        conn.tls = get(data, 'tls', false);
        conn.host = get(data, 'host', '127.0.0.1');
        conn.port = get(data, 'port', 1229);
      }
      commit('updateAddress', conn)
    }
  },
  modules: {
  },
})
