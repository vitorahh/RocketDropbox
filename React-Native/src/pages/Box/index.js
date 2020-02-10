import React, {Component} from 'react';

import api from '../../services/api';

import {View, Text, FlatList, TouchableOpacity} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import styles from './styles';

import Icon from 'react-native-vector-icons/MaterialIcons';

import {distanceInWords} from 'date-fns';
import pt from 'date-fns/locale/pt';

import RNFS from 'react-native-fs';
import fileViewer from 'react-native-file-viewer';
import socket from 'socket.io-client';
import ImagePicker from 'react-native-image-picker';

export default class Box extends Component {
  state = {box: {}};
  async componentDidMount() {
    const id = await AsyncStorage.getItem('@rocketBox:box');
    if (!id) {
      this.props.navigation.navigate('Main');
    }
    this.subscribeToNewFiles(id);
    const response = await api.get(`boxes/${id}`);
    this.setState({box: response.data});
  }
  subscribeToNewFiles = id => {
    const io = socket('https://omnistack-backend.herokuapp.com');
    io.emit('connectRoom', id);
    io.on('file', data => {
      this.setState({
        box: {...this.state.box, files: [data, ...this.state.box.files]},
      });
    });
  };
  async deleteAsyncStorage() {
    await AsyncStorage.removeItem('@rocketBox:box');
  }

  openFile = async file => {
    try {
      const filePatch = `${RNFS.DocumentDirectoryPath}/${file.title}`;
      await RNFS.downloadFile({
        fromUrl: file.url,
        toFile: filePatch,
      });
      await fileViewer.open(filePatch);
    } catch (err) {
      console.log('Arquivo Não Suportado!');
    }
  };
  handleUpload = () => {
    ImagePicker.launchImageLibrary({}, async upload => {
      if (upload.error) {
        console.log('ImagePicker error');
      } else if (upload.didCancel) {
        console.log('Canceled by user');
      } else {
        const data = new FormData();
        const [prefix, suffix] = upload.fileName.split('.');
        const ext = suffix.toLowerCase() === 'heic' ? 'jpg' : suffix;
        data.append(
          'file',
          //upload.file,
          {
            uri: upload.uri,
            type: upload.type,
            name: `${prefix}.${ext}`,
          },
        );

        api.post(`boxes/${this.state.box._id}/files`, data);
      }
    });
  };
  renderItem = ({item}) => (
    <TouchableOpacity onPress={() => this.openFile(item)} style={styles.file}>
      <View style={styles.fileInfo}>
        <Icon name="insert-drive-file" size={24} color="#A5Cfff" />
        <Text style={styles.fileTitle}>{item.title}</Text>
      </View>
      <Text style={styles.fileDate}>
        há{' '}
        {distanceInWords(item.createdAt, new Date(), {
          locale: pt,
        })}
      </Text>
    </TouchableOpacity>
  );
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.boxTitle}>{this.state.box.title}</Text>
        <FlatList
          style={styles.list}
          data={this.state.box.files}
          keyExtractor={file => file._id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={this.renderItem}
        />
        <TouchableOpacity style={styles.fab} onPress={this.handleUpload}>
          <Icon name="cloud-upload" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.delete}
          onPress={this.deleteAsyncStorage}>
          <Icon name="delete" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
}
