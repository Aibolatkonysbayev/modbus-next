// components/CRCCalculator.js
import React, { useState } from 'react'; // Импортируем React и хук useState

// --- Вспомогательные функции из вашего script.js ---
// (Можно вынести их в отдельный файл utils.js, но для простоты оставим здесь)
function calculateModbusCRC(byteArray) {
    const p = 0xA001;
    let crc = 0xFFFF;
    for (let i = 0; i < byteArray.length; i++) {
        crc ^= byteArray[i];
        for (let j = 0; j < 8; j++) {
            crc = ((crc & 1) === 1) ? (crc >> 1) ^ p : crc >> 1;
        }
    }
    return crc & 0xFFFF;
}

function formatHex(v, len = 2) {
    if (typeof v !== 'number' || isNaN(v)) return ''.padStart(len, '?');
    return v.toString(16).toUpperCase().padStart(len, '0');
}
// --- Конец вспомогательных функций ---

function CRCCalculator() {
    // --- Состояние Компонента ---
    // inputValue: хранит текст из поля ввода <textarea>
    const [inputValue, setInputValue] = useState('');
    // resultLE: хранит результат CRC (Low Byte First) для отображения
    const [resultLE, setResultLE] = useState('--');
    // resultBE: хранит результат CRC (High Byte First) для отображения
    const [resultBE, setResultBE] = useState('--');
    // status: отслеживает состояние калькулятора ('idle', 'success', 'error') для стилизации
    const [status, setStatus] = useState('idle'); // 'idle', 'success', 'error'

    // --- Обработчик изменения текста в textarea ---
    const handleInputChange = (event) => {
        setInputValue(event.target.value); // Обновляем состояние inputValue
        setStatus('idle'); // Сбрасываем статус при изменении ввода
        setResultLE('--');
        setResultBE('--');
    };

    // --- Обработчик клика по кнопке "Calculate CRC" ---
    const handleCalculateClick = () => {
        const txt = inputValue.trim();

        // Сброс перед вычислением
        setResultLE('--');
        setResultBE('--');
        setStatus('idle');

        if (!txt) {
            setResultLE('Error');
            setResultBE('Error');
            setStatus('error');
            return;
        }

        // Преобразуем строку hex-байт в массив чисел
        const hexStrings = txt.split(/[\s,]+/);
        const bytes = [];
        let parseError = false;

        for (const hex of hexStrings) {
            if (!hex) continue; // Пропускаем пустые строки (например, двойные пробелы)
            // Убираем префиксы 0x, 0X или суффикс h, H
            const cleanHex = hex.startsWith('0x') || hex.startsWith('0X')
                             ? hex.substring(2)
                             : hex.endsWith('h') || hex.endsWith('H')
                             ? hex.substring(0, hex.length - 1)
                             : hex;

            // Проверяем, что это валидный hex (1 или 2 символа)
            if (!/^[0-9A-Fa-f]{1,2}$/.test(cleanHex)) {
                parseError = true;
                break;
            }
            const val = parseInt(cleanHex, 16);
            if (isNaN(val)) {
                parseError = true;
                break;
            }
            bytes.push(val);
        }

        // Если была ошибка парсинга или не введено байт
        if (parseError || bytes.length === 0) {
            setResultLE('Error');
            setResultBE('Error');
            setStatus('error');
            return;
        }

        // Ошибок нет, вычисляем CRC
        try {
            const crc = calculateModbusCRC(bytes);
            const lowByte = crc & 0xFF;
            const highByte = (crc >> 8) & 0xFF;

            setResultLE(`${formatHex(lowByte)} ${formatHex(highByte)}`); // Обновляем состояние результата LE
            setResultBE(`${formatHex(highByte)} ${formatHex(lowByte)}`); // Обновляем состояние результата BE
            setStatus('success'); // Устанавливаем статус успеха

        } catch (error) {
            console.error("CRC calculation error:", error);
            setResultLE('Calc Error');
            setResultBE('Calc Error');
            setStatus('error');
        }
    };

    // --- JSX разметка компонента ---
    // Используем состояния (inputValue, resultLE, resultBE) для отображения данных
    // Используем обработчики (handleInputChange, handleCalculateClick) для кнопок и полей
    // Используем состояние status для динамического добавления CSS-классов
    return (
        <div className="content-section" id="crc-calculator-section">
            <h2>Modbus RTU CRC Calculator</h2>
            <p>Enter the Modbus RTU message frame bytes in hexadecimal format (separated by spaces or commas) below to calculate the CRC-16 checksum.</p>
            <div className="calculator-area">
                <label htmlFor="crc-input">Message Frame (Hex Bytes, e.g. 01 03 00 01 00 01):</label>
                <textarea
                    id="crc-input"
                    rows="2"
                    placeholder="Enter hex bytes here..."
                    value={inputValue} // Привязываем значение к состоянию inputValue
                    onChange={handleInputChange} // Вызываем обработчик при изменении
                ></textarea>
                <button
                    type="button"
                    id="calculate-crc-btn"
                    onClick={handleCalculateClick} // Вызываем обработчик при клике
                >
                    Calculate CRC
                </button>

                {/* Динамически добавляем класс 'success' или 'error' в зависимости от состояния status */}
                <div id="crc-result" className={`crc-result ${status === 'success' ? 'success' : status === 'error' ? 'error' : ''}`}>
                    Calculated CRC (Hex): <span className="crc-value">{resultLE}</span> {/* Отображаем состояние resultLE */}
                    <br /> (Low Byte First / Little-Endian)
                </div>
                <div id="crc-result-be" className={`crc-result-be ${status === 'success' ? 'success' : status === 'error' ? 'error' : ''}`}>
                     Calculated CRC (Hex): <span className="crc-value-be">{resultBE}</span> {/* Отображаем состояние resultBE */}
                     <br /> (High Byte First / Big-Endian)
                 </div>
            </div>
         </div>
    );
}

export default CRCCalculator; // Экспортируем компонент для использования в других файлах