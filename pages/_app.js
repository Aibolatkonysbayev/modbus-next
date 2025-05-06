import '../styles/globals.css'; // Импортируем наши глобальные стили

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;