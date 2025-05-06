// components/MessageConstructor.js
import React, { useState, useEffect, useCallback } from 'react';

// --- Вспомогательные функции ---
// (Берем из CRCCalculator или дублируем/импортируем из utils.js)

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

function decToHLBytes(decValue) {
    const val = parseInt(decValue, 10);
    if (isNaN(val) || val < 0 || val > 65535) return [0, 0]; // Возвращаем что-то по умолчанию
    const hi = (val >> 8) & 0xFF;
    const lo = val & 0xFF;
    return [hi, lo];
}
// --- Конец вспомогательных функций ---

// --- Данные для Шаблонов --- (как в оригинальном script.js)
const constructorTemplates = {
    'readTempFloat': {
        description: "Read Temperature (Float): Reads 2 Holding Registers (e.g., 40101, 40102) often used for float values. Assumes Slave ID 1, Address 100 (0-based).",
        values: { mode: 'rtu', slaveId: '1', functionCode: '03', param_read_reg_start: '100', param_read_reg_quantity: '2' } // Значения как строки для input
    },
    'setVfdSpeed': {
        description: "Set VFD Speed: Writes a value (e.g., 500 for 50%) to a single Holding Register (e.g., 40201). Assumes Slave ID 5, Address 200 (0-based).",
        values: { mode: 'rtu', slaveId: '5', functionCode: '06', param_wsr_address: '200', param_wsr_value: '500' }
    },
    'readInputs8': {
         description: "Read 8 Inputs: Reads status of 8 Discrete Inputs (e.g., 10001-10008). Assumes Slave ID 1, Start Address 0.",
         values: { mode: 'rtu', slaveId: '1', functionCode: '02', param_read_start: '0', param_read_quantity: '8' }
     },
    'startStopMotor': {
         description: "Start Motor: Writes to two coils (e.g., 00001=Start, 00002=Stop). Sets Coil 1 to ON (1) and Coil 2 to OFF (0). Assumes Slave ID 10, Start Address 0.",
         values: { mode: 'rtu', slaveId: '10', functionCode: '15', param_wmc_start: '0', param_wmc_quantity: '2', param_wmc_values: "1,0" }
     }
};

// Счетчик TCP TID (используем useRef чтобы он не сбрасывался при ререндерах)
let transactionIdCounter = Math.floor(Math.random() * 0xFFFE) + 1;


function MessageConstructor() {
    // --- Состояния для всех полей ввода ---
    // Добавляем эту строку:
    const [selectedTemplateKey, setSelectedTemplateKey] = useState(''); // Для <select> шаблонов
    const [msgMode, setMsgMode] = useState('rtu');
    const [slaveId, setSlaveId] = useState('1');
    const [ipAddress, setIpAddress] = useState('192.168.1.10');
    const [port, setPort] = useState('502');
    const [functionCode, setFunctionCode] = useState('');

    // Состояния для параметров функций (используем объект)
    const [params, setParams] = useState({
        'param-read-start': '0',
        'param-read-quantity': '1',
        'param-read-reg-start': '0',
        'param-read-reg-quantity': '1',
        'param-wsc-address': '0',
        'param-wsc-value': '0000', // 'FF00' or '0000'
        'param-wsr-address': '0',
        'param-wsr-value': '0',
        'param-wmc-start': '0',
        'param-wmc-quantity': '1',
        'param-wmc-values': '',
        'param-wmr-start': '0',
        'param-wmr-quantity': '1',
        'param-wmr-values': '',
    });

    // Состояния для вывода и ошибок
    const [messageOutput, setMessageOutput] = useState('');
    const [breakdownContent, setBreakdownContent] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [validationErrors, setValidationErrors] = useState({}); // Объект для ошибок валидации полей
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
    const [templateDescription, setTemplateDescription] = useState('');

    // --- Обновление видимости полей TCP ---
    const isTcpMode = msgMode === 'tcp';

    // --- Обработчик изменения полей ввода ---
    const handleInputChange = (event) => {
        const { id, value, type } = event.target;
        // Обновляем соответствующее состояние
        if (id === 'msg-mode') setMsgMode(value);
        else if (id === 'msg-slave-id') setSlaveId(value);
        else if (id === 'msg-ip') setIpAddress(value);
        else if (id === 'msg-port') setPort(value);
        else if (id === 'msg-function-code') {
            setFunctionCode(value);
            // Сбрасываем ошибки при смене функции
            setValidationErrors({});
            setErrorMsg('');
        } else {
            // Обновляем параметры функций
            setParams(prevParams => ({ ...prevParams, [id]: value }));
        }

        // Убираем сообщение об общей ошибке при любом изменении
        setErrorMsg('');
        // Убираем ошибку валидации для текущего поля
        if (validationErrors[id]) {
            setValidationErrors(prevErrors => {
                const newErrors = { ...prevErrors };
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    // --- Функция Валидации --- (Адаптировано из оригинального script.js)
    const validateInput = useCallback(() => {
        const errors = {};
        const currentParams = params; // Используем текущее состояние params

        const checkNumericRange = (id, min, max, defaultVal = '0') => {
            const valueStr = currentParams[id] ?? defaultVal;
            const value = parseInt(valueStr, 10);
             if (valueStr.trim() === '' || isNaN(value)) return `Field cannot be empty and must be a number.`;
             if (value < min || value > max) return `Value must be between ${min} and ${max}.`;
             return null; // No error
        };

        // Валидация общих полей
        const slaveIdVal = parseInt(slaveId, 10);
        if (isNaN(slaveIdVal) || slaveIdVal < 0 || slaveIdVal > 255) errors['msg-slave-id'] = 'Slave/Unit ID must be 0-255.';

        if (isTcpMode) {
            if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipAddress)) errors['msg-ip'] = 'Invalid IP format.';
            const portVal = parseInt(port, 10);
            if (isNaN(portVal) || portVal < 1 || portVal > 65535) errors['msg-port'] = 'Port must be 1-65535.';
        }

        if (!functionCode) errors['msg-function-code'] = 'Please select a function code.';

        // Валидация параметров функции
        switch (functionCode) {
            case '01': case '02':
                errors['param-read-start'] = checkNumericRange('param-read-start', 0, 0xFFFF);
                errors['param-read-quantity'] = checkNumericRange('param-read-quantity', 1, 2000);
                break;
            case '03': case '04':
                errors['param-read-reg-start'] = checkNumericRange('param-read-reg-start', 0, 0xFFFF);
                errors['param-read-reg-quantity'] = checkNumericRange('param-read-reg-quantity', 1, 125);
                break;
            case '05':
                errors['param-wsc-address'] = checkNumericRange('param-wsc-address', 0, 0xFFFF);
                // Value validation not needed for select FF00/0000
                break;
            case '06':
                errors['param-wsr-address'] = checkNumericRange('param-wsr-address', 0, 0xFFFF);
                errors['param-wsr-value'] = checkNumericRange('param-wsr-value', 0, 0xFFFF);
                break;
            case '15':
                errors['param-wmc-start'] = checkNumericRange('param-wmc-start', 0, 0xFFFF);
                errors['param-wmc-quantity'] = checkNumericRange('param-wmc-quantity', 1, 1968);
                const qtyWMC = parseInt(currentParams['param-wmc-quantity'] || '0', 10);
                const valuesWMC = (currentParams['param-wmc-values'] || '').split(',').map(s => s.trim()).filter(s => s !== '');
                if (!isNaN(qtyWMC) && qtyWMC > 0 && valuesWMC.length !== qtyWMC) errors['param-wmc-values'] = `Expected ${qtyWMC} values, got ${valuesWMC.length}.`;
                else if (valuesWMC.some(v => v !== '0' && v !== '1')) errors['param-wmc-values'] = 'Values must be comma-separated 0s or 1s.';
                 else if (qtyWMC > 0 && valuesWMC.length === 0) errors['param-wmc-values'] = 'Values cannot be empty.';
                break;
            case '16':
                errors['param-wmr-start'] = checkNumericRange('param-wmr-start', 0, 0xFFFF);
                errors['param-wmr-quantity'] = checkNumericRange('param-wmr-quantity', 1, 123);
                const qtyWMR = parseInt(currentParams['param-wmr-quantity'] || '0', 10);
                const valuesWMR = (currentParams['param-wmr-values'] || '').split(',').map(s => s.trim()).filter(s => s !== '');
                const parsedWMR = valuesWMR.map(s => parseInt(s, 10));
                if (!isNaN(qtyWMR) && qtyWMR > 0 && valuesWMR.length !== qtyWMR) errors['param-wmr-values'] = `Expected ${qtyWMR} values, got ${valuesWMR.length}.`;
                else if (parsedWMR.some(v => isNaN(v) || v < 0 || v > 65535)) errors['param-wmr-values'] = 'Values must be comma-separated numbers (0-65535).';
                else if (qtyWMR > 0 && valuesWMR.length === 0) errors['param-wmr-values'] = 'Values cannot be empty.';
                break;
            default:
                 // No specific param validation for unknown functions
                break;
        }

        // Удаляем null-значения (где ошибок нет)
        Object.keys(errors).forEach(key => {
            if (errors[key] === null) {
                delete errors[key];
            }
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0; // Возвращаем true если ошибок нет

    }, [params, slaveId, ipAddress, port, functionCode, msgMode, isTcpMode]); // Зависимости для useCallback

    // --- Функция разбора кадра --- (Адаптировано)
    const generateFrameBreakdown = (aduBytes, frameMode) => {
         // Эта функция теперь возвращает JSX или массив элементов для рендера
         const parts = [];
         let currentIndex = 0;
         const addPart = (label, valueHex, cssClass) => {
             // Используем React.Fragment или просто массив для генерации списка span'ов
             parts.push(
                 <React.Fragment key={`${label}-${currentIndex}`}>
                     <span className="bd-label">{label}:</span>
                     <span className={cssClass}>{valueHex}</span>{' '}
                 </React.Fragment>
             );
         };

         try {
             if (frameMode === 'tcp') {
                 if (aduBytes.length < 7) throw new Error("Incomplete MBAP Header");
                 addPart('TID', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-tid'); currentIndex += 2;
                 addPart('PID', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-pid'); currentIndex += 2;
                 addPart('Length', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-len'); currentIndex += 2;
                 addPart('Unit ID', formatHex(aduBytes[currentIndex]), 'bd-uid'); currentIndex += 1;
             } else { // rtu
                 if (aduBytes.length < 1) throw new Error("Missing Slave ID");
                 addPart('Slave ID', formatHex(aduBytes[currentIndex]), 'bd-sid'); currentIndex += 1;
             }

             if (currentIndex >= aduBytes.length) throw new Error("Missing Function Code");
             const fc = aduBytes[currentIndex];
             addPart('Func', formatHex(fc), 'bd-fc'); currentIndex += 1;
             let dataEndIndex = (frameMode === 'rtu') ? aduBytes.length - 2 : aduBytes.length; // До CRC или до конца для TCP

             // Разбор данных по коду функции
              switch (fc) {
                  case 1: case 2: // Read Coils/Discrete Inputs
                  case 3: case 4: // Read Holding/Input Registers
                       if (currentIndex + 4 > dataEndIndex) throw new Error("Incomplete data (Addr/Qty)");
                       addPart('Addr', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-addr'); currentIndex += 2;
                       addPart('Qty', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-qty'); currentIndex += 2;
                       break;
                  case 5: // Write Single Coil
                      if (currentIndex + 4 > dataEndIndex) throw new Error("Incomplete data (Addr/Value)");
                      addPart('Addr', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-addr'); currentIndex += 2;
                      addPart('Value', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-val'); currentIndex += 2;
                      break;
                   case 6: // Write Single Register
                       if (currentIndex + 4 > dataEndIndex) throw new Error("Incomplete data (Addr/Value)");
                       addPart('Addr', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-addr'); currentIndex += 2;
                       addPart('Value', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-val'); currentIndex += 2;
                       break;
                   case 15: // Write Multiple Coils
                       if (currentIndex + 5 > dataEndIndex) throw new Error("Incomplete data header (Addr/Qty/BC)");
                       addPart('Addr', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-addr'); currentIndex += 2;
                       addPart('Qty', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-qty'); currentIndex += 2;
                       const byteCountWMC = aduBytes[currentIndex];
                       addPart('ByteCount', formatHex(byteCountWMC), 'bd-bcount'); currentIndex += 1;
                       if (currentIndex + byteCountWMC > dataEndIndex) throw new Error("Byte count mismatch");
                       let coilValues = [];
                       for(let i=0; i<byteCountWMC; i++) { coilValues.push(formatHex(aduBytes[currentIndex+i])); }
                       addPart('Values', coilValues.join(' '), 'bd-val'); currentIndex += byteCountWMC;
                       break;
                   case 16: // Write Multiple Registers
                       if (currentIndex + 5 > dataEndIndex) throw new Error("Incomplete data header (Addr/Qty/BC)");
                       addPart('Addr', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-addr'); currentIndex += 2;
                       addPart('Qty', formatHex(aduBytes[currentIndex],2) + formatHex(aduBytes[currentIndex+1],2), 'bd-qty'); currentIndex += 2;
                       const byteCountWMR = aduBytes[currentIndex];
                       addPart('ByteCount', formatHex(byteCountWMR), 'bd-bcount'); currentIndex += 1;
                       if (currentIndex + byteCountWMR > dataEndIndex) throw new Error("Byte count mismatch");
                       let regValues = [];
                       for(let i=0; i<byteCountWMR; i+=2) {
                           if (currentIndex+i+1 >= dataEndIndex) { regValues.push('??'); break; }; // Защита
                           regValues.push(formatHex(aduBytes[currentIndex+i],2) + formatHex(aduBytes[currentIndex+i+1],2));
                       }
                       addPart('Values', regValues.join(' '), 'bd-val'); currentIndex += byteCountWMR;
                       break;
                  default: // Неизвестные данные
                      if (currentIndex < dataEndIndex) {
                          let remainingData = [];
                          for(let i=currentIndex; i<dataEndIndex; i++) { remainingData.push(formatHex(aduBytes[i])); }
                          addPart('Data', remainingData.join(' '), 'bd-val');
                          currentIndex = dataEndIndex;
                      }
                      break;
              }

             if (frameMode === 'rtu') {
                 if (currentIndex !== dataEndIndex) console.warn("RTU Data parsing maybe incomplete before CRC.");
                 if (aduBytes.length < currentIndex + 2) throw new Error("Missing CRC");
                 addPart('CRC', formatHex(aduBytes[aduBytes.length - 2]) + formatHex(aduBytes[aduBytes.length - 1]), 'bd-crc');
             } else { // tcp
                  if (currentIndex !== dataEndIndex) console.warn("TCP Data parsing maybe incomplete for PDU.");
             }

         } catch (e) {
             console.error("Breakdown error:", e);
             // Возвращаем сообщение об ошибке как JSX
             return <span className="bd-err">{`Breakdown Error: ${e.message}`}</span>;
         }

         return parts; // Возвращаем массив JSX-элементов
    };

    // --- Обработчик кнопки "Construct Frame" ---
    const handleConstructClick = () => {
        setMessageOutput('');
        setBreakdownContent('');
        setErrorMsg('');
        setIsBreakdownVisible(false);
        setCopyButtonText('Copy');
        // setValidationErrors({}); // Очищаем ошибки перед новой валидацией

        if (!validateInput()) {
            setErrorMsg("Error: Please correct the errors highlighted above.");
            // Не очищаем breakdown, если были ошибки валидации, чтобы пользователь видел проблему
            return;
        }

        let outputString = '';
        let aduBytes = [];
        let currentMode = msgMode; // Используем состояние
        let currentFC = parseInt(functionCode, 10);

        try {
            let pdu = [currentFC];
            let address, quantity, valueHexStr, valueDec, valuesStr, valuesArr, byteCount;
            const currentParams = params; // Берем текущие параметры из состояния

            // Сборка PDU
            switch (currentFC) {
                case 1: case 2:
                    address = parseInt(currentParams['param-read-start'], 10);
                    quantity = parseInt(currentParams['param-read-quantity'], 10);
                    pdu.push(...decToHLBytes(address), ...decToHLBytes(quantity));
                    break;
                case 3: case 4:
                    address = parseInt(currentParams['param-read-reg-start'], 10);
                    quantity = parseInt(currentParams['param-read-reg-quantity'], 10);
                    pdu.push(...decToHLBytes(address), ...decToHLBytes(quantity));
                    break;
                case 5:
                    address = parseInt(currentParams['param-wsc-address'], 10);
                    valueHexStr = currentParams['param-wsc-value']; // FF00 или 0000
                    pdu.push(...decToHLBytes(address));
                    pdu.push(parseInt(valueHexStr.substring(0, 2), 16)); // Hi byte (FF or 00)
                    pdu.push(parseInt(valueHexStr.substring(2, 4), 16)); // Lo byte (00)
                    break;
                case 6:
                    address = parseInt(currentParams['param-wsr-address'], 10);
                    valueDec = parseInt(currentParams['param-wsr-value'], 10);
                    pdu.push(...decToHLBytes(address), ...decToHLBytes(valueDec));
                    break;
                case 15:
                    address = parseInt(currentParams['param-wmc-start'], 10);
                    quantity = parseInt(currentParams['param-wmc-quantity'], 10);
                    valuesStr = currentParams['param-wmc-values'];
                    valuesArr = valuesStr.split(',').map(s => parseInt(s.trim(), 10));
                    byteCount = Math.ceil(quantity / 8);
                    pdu.push(...decToHLBytes(address), ...decToHLBytes(quantity), byteCount);
                    let packedByte = 0;
                    for (let i = 0; i < quantity; i++) {
                        if (valuesArr[i] === 1) { packedByte |= (1 << (i % 8)); }
                        if ((i + 1) % 8 === 0 || i === quantity - 1) {
                            pdu.push(packedByte);
                            packedByte = 0;
                        }
                    }
                    break;
                 case 16:
                    address = parseInt(currentParams['param-wmr-start'], 10);
                    quantity = parseInt(currentParams['param-wmr-quantity'], 10);
                    valuesStr = currentParams['param-wmr-values'];
                    valuesArr = valuesStr.split(',').map(s => parseInt(s.trim(), 10));
                    byteCount = quantity * 2;
                    pdu.push(...decToHLBytes(address), ...decToHLBytes(quantity), byteCount);
                    valuesArr.forEach(val => { pdu.push(...decToHLBytes(val)); });
                    break;
                default:
                    throw new Error(`Function code ${currentFC} construction not implemented.`);
            }

            // Сборка ADU
            const currentSlaveId = parseInt(slaveId, 10);
            if (currentMode === 'rtu') {
                aduBytes = [currentSlaveId, ...pdu];
                const crc = calculateModbusCRC(aduBytes);
                aduBytes.push(crc & 0xFF, (crc >> 8) & 0xFF); // Low, High
            } else { // tcp
                const unitId = currentSlaveId;
                const pduLength = pdu.length;
                const mbapLength = pduLength + 1; // UnitID + PDU
                const tid = transactionIdCounter++;
                if (transactionIdCounter > 0xFFFF) transactionIdCounter = 1;
                const mbapHeader = [
                    (tid >> 8) & 0xFF, tid & 0xFF, // Transaction ID
                    0, 0,                           // Protocol ID (0)
                    (mbapLength >> 8) & 0xFF, mbapLength & 0xFF, // Length
                    unitId                          // Unit ID
                ];
                aduBytes = [...mbapHeader, ...pdu];
            }

            outputString = aduBytes.map(byte => formatHex(byte)).join(' ');

            // Обновляем состояния вывода
            setMessageOutput(outputString);
            setBreakdownContent(generateFrameBreakdown(aduBytes, currentMode));
            setIsBreakdownVisible(true);
            setErrorMsg(''); // Очищаем общую ошибку, если все успешно

        } catch (error) {
            console.error("Frame construction error:", error);
            setErrorMsg(`Error: ${error.message}`);
            setMessageOutput('');
            setBreakdownContent('');
             setIsBreakdownVisible(false);
        }
    };

    // --- Обработчик кнопки "Copy" ---
    const handleCopyClick = () => {
        if (!messageOutput) return;
        navigator.clipboard.writeText(messageOutput).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 1500);
        }).catch(err => {
            console.error('Failed to copy frame: ', err);
            setCopyButtonText('Error');
             setTimeout(() => setCopyButtonText('Copy'), 1500);
        });
    };

     // --- Обработчик выбора Шаблона ---
     // --- Обработчик выбора Шаблона (ИСПРАВЛЕННЫЙ) ---
const handleTemplateChange = (event) => {
    const selectedKey = event.target.value;
    setSelectedTemplateKey(selectedKey); // Обновляем состояние выбранного ключа

    if (!selectedKey) {
        // Если выбрали "-- Select Template --", очищаем описание
        setTemplateDescription('');
        return;
    }

    const template = constructorTemplates[selectedKey];
    if (!template) {
        setTemplateDescription(''); // На всякий случай
        return;
    }

    const values = template.values;
    setTemplateDescription(template.description || ''); // Устанавливаем описание

    // Применяем значения из шаблона (код ниже без изменений)
    setMsgMode(values.mode || 'rtu');
    setSlaveId(String(values.slaveId || '1'));
    setFunctionCode(values.functionCode || '');
    const defaultParams = Object.keys(params).reduce((acc, key) => {
       acc[key] = key === 'param-wsc-value' ? '0000' : '0';
        if (key.includes('values')) acc[key] = '';
        if (key.includes('quantity')) acc[key] = '1';
        return acc;
    }, {});
    const newParams = { ...defaultParams };
    for (const key in values) {
        if (key.startsWith('param_')) {
            const paramId = key.replace(/_/g, '-');
            if (newParams.hasOwnProperty(paramId)) {
                 newParams[paramId] = String(values[key]);
            }
        }
    }
    setParams(newParams);

    // УДАЛЕНЫ строки: event.target.value = ""; и setTimeout(...)

    // Сброс ошибок после применения шаблона
    setErrorMsg('');
    setValidationErrors({});
};


    // --- JSX разметка конструктора ---
    return (
        <div className="content-section" id="message-constructor-section">
             <h2>Modbus Message Constructor</h2>
             <p>Select the parameters below to construct a Modbus request frame (Master perspective). Remember that addresses here are <strong>0-based</strong>.</p>
             <div className="tool-area">
                {/* Шаблоны */}
                 <div className="tool-row">
                     <div className="tool-group full-width">
                         <label htmlFor="msg-template">Select Template (Optional):</label>
                         <select id="msg-template" onChange={handleTemplateChange}>
                            value={selectedTemplateKey}
                             <option value="">-- Select Template --</option>
                             <option value="readTempFloat">Read Temperature (Float, 2 Holding Regs)</option>
                             <option value="setVfdSpeed">Set VFD Speed (Single Holding Reg)</option>
                             <option value="readInputs8">Read 8 Discrete Inputs</option>
                             <option value="startStopMotor">Start/Stop Motor (2 Coils)</option>
                         </select>
                         
                         {templateDescription && (
                            <div className="template-description" style={{marginTop: '5px', fontSize: '0.9em', color: '#555'}}>
                                {templateDescription}
                            </div>
                         )}
                     </div>
                 </div>

                 {/* Общие параметры */}
                 <div className="tool-row">
                     <div className="tool-group">
                        <label htmlFor="msg-mode">Mode:</label>
                        <select id="msg-mode" value={msgMode} onChange={handleInputChange}>
                            <option value="rtu">RTU</option>
                            <option value="tcp">TCP</option>
                         </select>
                     </div>
                     <div className="tool-group">
                         <label htmlFor="msg-slave-id">Slave ID / Unit ID:</label>
                         <input
                            type="number"
                            id="msg-slave-id"
                            min="0" max="255"
                            value={slaveId}
                            onChange={handleInputChange}
                            className={`validation-input ${validationErrors['msg-slave-id'] ? 'input-error' : ''}`}
                            title={validationErrors['msg-slave-id'] || ''}
                         />
                     </div>
                 </div>

                 {/* Параметры TCP (условный рендеринг) */}
                 {isTcpMode && (
                    <div className="tool-row tcp-only">
                        <div className="tool-group">
                            <label htmlFor="msg-ip">Target IP Address:</label>
                            <input
                                type="text"
                                id="msg-ip"
                                placeholder="e.g., 192.168.1.10"
                                value={ipAddress}
                                onChange={handleInputChange}
                                className={`validation-input ${validationErrors['msg-ip'] ? 'input-error' : ''}`}
                                title={validationErrors['msg-ip'] || ''}
                            />
                        </div>
                        <div className="tool-group">
                             <label htmlFor="msg-port">Target Port:</label>
                             <input
                                type="number"
                                id="msg-port"
                                placeholder="e.g., 502"
                                min="1" max="65535"
                                value={port}
                                onChange={handleInputChange}
                                className={`validation-input ${validationErrors['msg-port'] ? 'input-error' : ''}`}
                                title={validationErrors['msg-port'] || ''}
                             />
                        </div>
                    </div>
                 )}

                 {/* Выбор кода функции */}
                 <div className="tool-row">
                     <div className="tool-group full-width">
                         <label htmlFor="msg-function-code">Function Code:</label>
                         <select
                            id="msg-function-code"
                            value={functionCode}
                            onChange={handleInputChange}
                            className={`validation-input ${validationErrors['msg-function-code'] ? 'input-error' : ''}`}
                            title={validationErrors['msg-function-code'] || ''}
                          >
                             <option value="" disabled>-- Select Function --</option>
                             <option value="01">01: Read Coils</option>
                             <option value="02">02: Read Discrete Inputs</option>
                             <option value="03">03: Read Holding Registers</option>
                             <option value="04">04: Read Input Registers</option>
                             <option value="05">05: Write Single Coil</option>
                             <option value="06">06: Write Single Register</option>
                             <option value="15">15 (0F): Write Multiple Coils</option>
                             <option value="16">16 (10): Write Multiple Registers</option>
                         </select>
                     </div>
                 </div>

                 {/* Контейнер для параметров функции (условный рендеринг) */}
                 <div id="function-params-container">
                    {/* FC 01 / 02 */}
                    {(functionCode === '01' || functionCode === '02') && (
                        <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-read-start">Start Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-read-start'] ? 'input-error' : ''}`} id="param-read-start" min="0" max="65535" value={params['param-read-start']} onChange={handleInputChange} title={validationErrors['param-read-start'] || ''} />
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-read-quantity">Quantity:</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-read-quantity'] ? 'input-error' : ''}`} id="param-read-quantity" min="1" max="2000" value={params['param-read-quantity']} onChange={handleInputChange} title={validationErrors['param-read-quantity'] || ''} />
                                 </div>
                             </div>
                         </div>
                    )}
                     {/* FC 03 / 04 */}
                     {(functionCode === '03' || functionCode === '04') && (
                        <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-read-reg-start">Start Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-read-reg-start'] ? 'input-error' : ''}`} id="param-read-reg-start" min="0" max="65535" value={params['param-read-reg-start']} onChange={handleInputChange} title={validationErrors['param-read-reg-start'] || ''} />
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-read-reg-quantity">Quantity:</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-read-reg-quantity'] ? 'input-error' : ''}`} id="param-read-reg-quantity" min="1" max="125" value={params['param-read-reg-quantity']} onChange={handleInputChange} title={validationErrors['param-read-reg-quantity'] || ''} />
                                 </div>
                             </div>
                         </div>
                     )}
                      {/* FC 05 */}
                     {functionCode === '05' && (
                         <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-wsc-address">Coil Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wsc-address'] ? 'input-error' : ''}`} id="param-wsc-address" min="0" max="65535" value={params['param-wsc-address']} onChange={handleInputChange} title={validationErrors['param-wsc-address'] || ''} />
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-wsc-value">Value (ON/OFF):</label>
                                     <select className={`param-input validation-input ${validationErrors['param-wsc-value'] ? 'input-error' : ''}`} id="param-wsc-value" value={params['param-wsc-value']} onChange={handleInputChange} title={validationErrors['param-wsc-value'] || ''}>
                                         <option value="FF00">ON (FF00)</option>
                                         <option value="0000">OFF (0000)</option>
                                     </select>
                                 </div>
                             </div>
                         </div>
                     )}
                      {/* FC 06 */}
                     {functionCode === '06' && (
                         <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-wsr-address">Register Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wsr-address'] ? 'input-error' : ''}`} id="param-wsr-address" min="0" max="65535" value={params['param-wsr-address']} onChange={handleInputChange} title={validationErrors['param-wsr-address'] || ''}/>
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-wsr-value">Value (Decimal 0-65535):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wsr-value'] ? 'input-error' : ''}`} id="param-wsr-value" min="0" max="65535" value={params['param-wsr-value']} onChange={handleInputChange} title={validationErrors['param-wsr-value'] || ''}/>
                                 </div>
                             </div>
                         </div>
                     )}
                      {/* FC 15 */}
                     {functionCode === '15' && (
                         <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-wmc-start">Start Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wmc-start'] ? 'input-error' : ''}`} id="param-wmc-start" min="0" max="65535" value={params['param-wmc-start']} onChange={handleInputChange} title={validationErrors['param-wmc-start'] || ''}/>
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-wmc-quantity">Quantity of Coils (1-1968):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wmc-quantity'] ? 'input-error' : ''}`} id="param-wmc-quantity" min="1" max="1968" value={params['param-wmc-quantity']} onChange={handleInputChange} title={validationErrors['param-wmc-quantity'] || ''}/>
                                 </div>
                             </div>
                             <div className="tool-row">
                                 <div className="tool-group full-width">
                                     <label htmlFor="param-wmc-values">Values (Comma-separated 0s/1s):</label>
                                     <input type="text" className={`param-input validation-input ${validationErrors['param-wmc-values'] ? 'input-error' : ''}`} id="param-wmc-values" value={params['param-wmc-values']} onChange={handleInputChange} placeholder="e.g., 1,0,1,1,0..." title={validationErrors['param-wmc-values'] || ''}/>
                                 </div>
                             </div>
                         </div>
                     )}
                      {/* FC 16 */}
                     {functionCode === '16' && (
                         <div className="function-params">
                             <div className="tool-row">
                                 <div className="tool-group">
                                     <label htmlFor="param-wmr-start">Start Address (0-based):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wmr-start'] ? 'input-error' : ''}`} id="param-wmr-start" min="0" max="65535" value={params['param-wmr-start']} onChange={handleInputChange} title={validationErrors['param-wmr-start'] || ''}/>
                                 </div>
                                 <div className="tool-group">
                                     <label htmlFor="param-wmr-quantity">Quantity of Registers (1-123):</label>
                                     <input type="number" className={`param-input validation-input ${validationErrors['param-wmr-quantity'] ? 'input-error' : ''}`} id="param-wmr-quantity" min="1" max="123" value={params['param-wmr-quantity']} onChange={handleInputChange} title={validationErrors['param-wmr-quantity'] || ''}/>
                                 </div>
                             </div>
                             <div className="tool-row">
                                 <div className="tool-group full-width">
                                     <label htmlFor="param-wmr-values">Values (Comma-separated Dec 0-65535):</label>
                                     <input type="text" className={`param-input validation-input ${validationErrors['param-wmr-values'] ? 'input-error' : ''}`} id="param-wmr-values" value={params['param-wmr-values']} onChange={handleInputChange} placeholder="e.g., 100, 255, 0, 1234..." title={validationErrors['param-wmr-values'] || ''}/>
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Кнопка Сборки */}
                 <button type="button" id="construct-message-btn" onClick={handleConstructClick}>
                    Construct Frame
                 </button>

                 {/* Область Вывода */}
                 <div className="output-area">
                     <label htmlFor="message-output">Generated Frame (Hex Bytes):</label>
                     <div className="frame-output-wrapper">
                         <textarea
                            id="message-output"
                            rows="3" readOnly
                            placeholder="Frame will appear here..."
                            value={messageOutput}
                            className={errorMsg ? 'input-error' : ''} // Помечаем ошибкой если генерация не удалась
                          ></textarea>
                         {messageOutput && !errorMsg && ( // Показываем кнопку только если есть что копировать и нет ошибок
                            <button
                                type="button"
                                id="copy-frame-btn"
                                title="Copy to clipboard"
                                onClick={handleCopyClick}
                                className={copyButtonText === 'Copied!' ? 'copied' : ''}
                            >
                                {copyButtonText}
                            </button>
                          )}
                     </div>
                     {/* Разбор кадра (условный рендеринг) */}
                      {isBreakdownVisible && !errorMsg && (
                        <div id="message-breakdown" className="message-breakdown">
                             <h4>Frame Breakdown:</h4>
                             <div id="breakdown-content">{breakdownContent}</div>
                         </div>
                      )}
                     {/* Сообщение об общей ошибке */}
                     {errorMsg && (
                        <div id="constructor-error-msg" className="error-message">
                            {errorMsg}
                        </div>
                     )}
                 </div>
             </div>
         </div>
    );
}

export default MessageConstructor;