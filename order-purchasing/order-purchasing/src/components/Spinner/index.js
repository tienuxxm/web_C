import { ProgressSpinner } from 'primereact/progressspinner';

function Spinner() {
  return (
    <div style={styles.overlay}>
      <ProgressSpinner
        style={{ width: '60px', height: '60px' }}
        strokeWidth="6"
        animationDuration=".7s"
      />
      {/* <div style={styles.text}>Đang tải dữ liệu...</div> */}
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#333',
  },
};

export default Spinner;
