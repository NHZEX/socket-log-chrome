import { createStore } from 'vuex'
import { get } from 'lodash'
import { getAddressData, getClientId, getRunningState, isEnableListen } from "../storage";

export default createStore({
  state () {
    return {
      address: {
        host: 'localhost',
        port: 1229,
        path: '/',
        tls: false,
      },
      enableListen: false,
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
      state.enableListen = enable
    }
  },
  actions: {
    async loadStorageData ({ commit, dispatch, state }) {
      commit('updateClient', await getClientId())
      commit('setEnable', await isEnableListen())
      await dispatch('syncStatusMessage')
      await dispatch('readStorageAddress')

      console.log('加载存储数据完成', state)
    },
    async saveStorageData ({ state }) {
      await chrome.storage.local.set({
        address: state.address,
        clientId: state.clientId,
        enableListen: state.enableListen,
      })
    },
    async syncStatusMessage ({ commit }) {
      commit('updateState', await getRunningState() || '无状态')
    },
    async readStorageAddress ({ commit }) {
      const conn = {}
      const data = await getAddressData()
      conn.tls = get(data, 'tls', false);
      conn.host = get(data, 'host', '127.0.0.1');
      conn.port = get(data, 'port', 1229);
      conn.path = get(data, 'path', '/');
      commit('updateAddress', conn)
    }
  },
  modules: {
  },
})
