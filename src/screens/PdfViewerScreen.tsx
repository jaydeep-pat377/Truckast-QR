import React from 'react';
import {StyleSheet, View} from 'react-native';
import Pdf from 'react-native-pdf';
import {useRoute, RouteProp} from '@react-navigation/native';
import {useAppTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../types';

type RouteProps = RouteProp<RootStackParamList, 'PdfViewer'>;

const PdfViewerScreen: React.FC = () => {
  const theme = useAppTheme();
  const route = useRoute<RouteProps>();
  const {filePath} = route.params;

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Pdf
        source={{uri: filePath}}
        style={styles.pdf}
        enablePaging
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdf: {
    flex: 1,
  },
});

export default PdfViewerScreen;
