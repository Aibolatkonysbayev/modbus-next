import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';
import React, { useEffect, useRef, useState } from 'react';

// Импортируем компоненты
import CRCCalculator from '../components/CRCCalculator';
import MessageConstructor from '../components/MessageConstructor'; // Убедитесь, что этот файл существует и содержит код компонента
import Quiz from '../components/Quiz';

export default function Home() {
  // --- Refs ---
  const logoWrapperRef = useRef(null);
  const headingRef = useRef(null);
  // --- Состояние ---
  const [isAnimeLoaded, setIsAnimeLoaded] = useState(false);

  // --- useEffect для Анимаций ---
  useEffect(() => {
    if (!isAnimeLoaded) return;

    const anime = window.anime;
    if (typeof anime !== 'function') {
         console.error("window.anime is not available yet.");
         return;
    }

    console.log('Anime.js loaded, running ALL animations...');
    let didRunOnce = false;

    const runAllAnimations = () => {
        if(didRunOnce) return;

        try {
            // --- Анимация Логотипа ---
            if (logoWrapperRef.current) {
                anime({ /* ... параметры лого ... */
                  targets: logoWrapperRef.current, translateY: [-30, 0], opacity: [0, 1],
                  duration: 1000, delay: 100, easing: 'easeOutCubic'
                });
            }

            // --- Сложная Анимация Заголовка H1 (Исправленная) ---
            if (headingRef.current) {
                const textWrapper = headingRef.current;
                console.log('H1 textContent before manipulation:', `'${textWrapper.textContent}'`); // Лог для проверки текста

                // Проверяем, что текст есть и еще не разбит на span'ы
                if (textWrapper.textContent?.trim().length > 0 && !textWrapper.querySelector('.letter')) {
                     console.log('Splitting H1 into letters...');
                     textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

                     // Запускаем сложную анимацию только ПОСЛЕ разбивки
                     anime({ /* ... параметры H1 ... */
                        targets: '.main-heading .letter', translateY: [ { value: '-1em', duration: 500, easing: 'easeOutExpo' }, { value: 0, duration: 700, easing: 'easeOutBounce', delay: 100 } ],
                        rotate: { value: '1turn', duration: 800, easing: 'easeOutExpo' }, opacity: [0, 1],
                        duration: 1500, delay: anime.stagger(50), loop: true, loopDelay: 1500
                     });
                } else if (textWrapper.querySelector('.letter')) {
                    // Если span'ы уже есть (например, из-за Strict Mode), просто запускаем анимацию
                    console.log('H1 letters already exist, running animation...');
                    anime({ /* ... те же параметры H1 ... */
                        targets: '.main-heading .letter', translateY: [ { value: '-1em', duration: 500, easing: 'easeOutExpo' }, { value: 0, duration: 700, easing: 'easeOutBounce', delay: 100 } ],
                        rotate: { value: '1turn', duration: 800, easing: 'easeOutExpo' }, opacity: [0, 1],
                        duration: 1500, delay: anime.stagger(50), loop: true, loopDelay: 1500
                     });
                } else {
                    console.warn("H1 text content is empty, cannot animate letters.");
                }
            }

             // --- Анимация Кабелей SVG ---
             // ... (код анимации кабелей и сигналов как в прошлый раз) ...
            const cables = document.querySelectorAll('#cables-svg path');
            let cableDrawDuration = 2500; let cableDrawDelay = 700;
            if (cables.length > 0) { cables.forEach(path => { if (typeof path.getTotalLength === 'function') { const pathLength = path.getTotalLength(); path.style.strokeDasharray = pathLength; path.style.strokeDashoffset = pathLength; anime({ targets: path, strokeDashoffset: [pathLength, 0], duration: cableDrawDuration, delay: cableDrawDelay, easing: 'easeInOutSine' }); } });
              const signal1 = document.querySelector('#signal-1'); const path1 = document.querySelector('#cable-path-1'); if (signal1 && path1 && typeof path1.getPointAtLength === 'function') { try { const motionPath1 = anime.path(path1); anime({ targets: signal1, translateX: motionPath1('x'), translateY: motionPath1('y'), opacity: [ { value: 1, duration: 100 }, { value: 1, duration: 1800 }, { value: 0, duration: 100 } ], duration: anime.random(1800, 2400), delay: cableDrawDelay + anime.random(300, 600), easing: 'linear', loop: true, loopDelay: anime.random(800, 1500) }); } catch (pathError) { console.error("Error path 1:", pathError); } }
              const signal2 = document.querySelector('#signal-2'); const path2 = document.querySelector('#cable-path-2'); if (signal2 && path2 && typeof path2.getPointAtLength === 'function') { try { const motionPath2 = anime.path(path2); anime({ targets: signal2, translateX: motionPath2('x'), translateY: motionPath2('y'), opacity: [ { value: 1, duration: 100 }, { value: 1, duration: 2100 }, { value: 0, duration: 100 } ], duration: anime.random(2100, 2700), delay: cableDrawDelay + anime.random(600, 1000), easing: 'linear', loop: true, loopDelay: anime.random(1000, 1800), direction: 'reverse' }); } catch (pathError) { console.error("Error path 2:", pathError); } }
            }

            // --- Анимация Пунктов Списка (li) ---
             // ... (код анимации списка как в прошлый раз) ...
            const listItems = document.querySelectorAll('.content-section:not(#crc-calculator-section):not(#message-constructor-section):not(.quiz-section) h2 + ul li'); if (listItems.length > 0) { anime({ targets: listItems, translateX: [-20, 0], opacity: [0, 1], duration: 800, delay: anime.stagger(100, { start: 500 }) }); }

            // --- Настройка IntersectionObserver для H2 ---
             // ... (код IntersectionObserver как в прошлый раз) ...
            const observerCallback = (entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { const targetHeader = entry.target; if (typeof window.anime === 'function') { window.anime({ targets: targetHeader, translateX: ['-50px', 0], opacity: [0, 1], rotate: [-2, 0], duration: 600, easing: 'easeOutExpo', delay: 50 }); } observer.unobserve(targetHeader); } }); }; const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 }; const headerObserver = new IntersectionObserver(observerCallback, observerOptions); const headersToAnimate = document.querySelectorAll('.content-section h2'); if (headersToAnimate.length > 0) { headersToAnimate.forEach(header => { if (window.getComputedStyle(header).opacity === '0') { headerObserver.observe(header); } else { header.style.opacity = '1'; header.style.transform = 'none'; } }); }

            didRunOnce = true;

            return () => { // Функция очистки
              if (headerObserver) headerObserver.disconnect();
              // Очистка других анимаций (особенно зацикленных) при необходимости
              // anime.remove('.main-heading .letter');
              // anime.remove('#signal-1');
              // anime.remove('#signal-2');
              // ... и т.д.
            };

        } catch (error) {
           console.error("Error in runAllAnimations:", error);
           return () => {};
        }
    };

    const cleanup = runAllAnimations();
    return cleanup;

  }, [isAnimeLoaded]);

  // --- Возвращаем JSX ---
  // ВАЖНО: Здесь восстановлен ВЕСЬ текст из вашего index.html
  return (
    <>
      <Head>
        <title>Modbus Platform - Advanced People</title>
        <meta name="description" content="Modbus learning platform by Advanced People" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* SVG кабели и сигналы */}
      <svg id="cables-svg" xmlns="http://www.w3.org/2000/svg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
         <path id="cable-path-1" d="M 150 0 Q 180 300 150 600 T 180 900 L 180 1200" />
         <path id="cable-path-2" d="M 250 0 Q 220 400 250 800 T 220 1200 L 220 1500" />
         <circle id="signal-1" r="5" />
         <circle id="signal-2" r="5" />
      </svg>

      {/* Логотип */}
      {/* Убрали opacity: 0, анимация сама справится */}
      <div ref={logoWrapperRef} style={{ textAlign: 'center' }}>
        <Image
          src="/logo_black_5@2x.png"
          alt="Advanced People Logo (Black)"
          width={150}
          height={55}
          className="site-logo"
          priority
        />
      </div>


      {/* Основной контейнер */}
      <div className="container">

        {/* Заголовок H1 */}
         {/* Убрали opacity: 0, добавили ref */}
        <h1 className="main-heading" ref={headingRef}>
          MODBUS
        </h1>

        {/* --- Секции Контента (ПОЛНЫЙ ТЕКСТ) --- */}
        <div className="content-section" key="intro">
            <p>This is our learning platform where we will explore industrial protocols and networks step by step, starting from the basics. We use modern web technologies, including animation, to make the learning process more engaging and intuitive.</p>
        </div>
        <div className="content-section" key="what-protocol">
            <h2>What is a protocol?</h2>
            <p>A protocol is a set of rules for formatting and processing data. Network protocols act like a common language for computers and devices. Even if devices use vastly different hardware or software, protocols enable them to communicate effectively.</p>
             {/* Список для анимации li */}
        </div>
        <div className="content-section" key="what-modbus">
            <h2>What is Modbus?</h2>
            <p>Modbus is one of the most widely used protocols in industrial automation. Its key features include:</p>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Open:</strong> Freely available without licensing fees.</li>
                <li><strong>Architecture:</strong> Operates on a Master/Slave principle.</li>
                <li><strong>Versions:</strong> Exists for serial lines (Modbus RTU/ASCII) and Ethernet networks (Modbus TCP).</li>
                <li><strong>OSI/TCP/IP Layer:</strong> It&aposs an Application Layer protocol.</li>
                <li><strong>Simplicity:</strong> Considered relatively easy to implement and configure.</li>
            </ul>
        </div>
         <div className="content-section" key="rtu-vs-tcp">
            <h2>Modbus RTU vs Modbus TCP</h2>
            <p>While both variants transfer Modbus data, they use different transport layers and message framing:</p>
            <p><strong>Modbus RTU (Remote Terminal Unit):</strong></p>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Transport:</strong> Uses serial communication lines like <code>{'RS-485'}</code> or RS-232.</li>
                <li><strong>Data Format:</strong> Binary transmission.</li>
                <li><strong>Message Delimitation:</strong> Uses silent intervals on the line (min. 3.5 char times).</li>
                <li><strong>Error Checking:</strong> Employs <code>{'CRC'}</code> (Cyclic Redundancy Check).</li>
                <li><strong>Addressing:</strong> Devices identified by a unique <code>{'Slave ID'}</code> (1-247) on the serial line.</li>
            </ul>
            <p><strong>Modbus TCP:</strong></p>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Transport:</strong> Runs over standard Ethernet networks using <code>{'TCP/IP'}</code>.</li>
                <li><strong>Data Format:</strong> Binary PDU wrapped within a TCP/IP packet.</li>
                <li><strong>Message Delimitation:</strong> Handled by the TCP protocol itself.</li>
                <li><strong>Error Checking:</strong> Uses an <code>{'MBAP Header'}</code> (Modbus Application Protocol Header) prefix; TCP handles data integrity.</li>
                <li><strong>Addressing:</strong> Devices identified by <code>{'IP Address'}</code> and <code>{'TCP Port'}</code> (usually 502). Uses a <code>{'Unit ID'}</code> within the MBAP Header, mainly for gateways.</li>
            </ul>
        </div>
        <div className="content-section" key="message-structure">
            <h2>Modbus Message Structure</h2>
            <p>At the core of any Modbus communication lies the <strong><code>{'PDU'}</code> (Protocol Data Unit)</strong>. This unit is independent of whether Modbus RTU or TCP is used.</p>
            <p>The <code>{'PDU'}</code> consists of:</p>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Function Code (1 Byte):</strong> Specifies the action the slave should perform (e.g., <code>{'01'}</code> Read Coils, <code>{'03'}</code> Read Holding Registers, <code>{'06'}</code> Write Single Register, <code>{'16'}</code> Write Multiple Registers).</li>
                <li><strong>Data (N Bytes):</strong> Contains information needed for the function, such as register addresses, quantity of items, or data values to write. Its content varies based on the function code.</li>
            </ul>
            <p>For actual transmission, this <code>{'PDU'}</code> is wrapped into an <strong><code>{'ADU'}</code> (Application Data Unit)</strong>:</p>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Modbus RTU ADU:</strong><br />
                    <code>{'[Slave ID] + [Function Code + Data (PDU)] + [CRC]'}</code><br />
                    {'(Address + PDU + Error Check)'}
                </li>
                <li><strong>Modbus TCP ADU:</strong><br />
                    <code>{'[MBAP Header] + [Function Code + Data (PDU)]'}</code><br />
                    {'(TCP Specific Header + PDU)'}
                </li>
            </ul>
        </div>
        <Quiz />
         <div className="content-section" key="data-rep">
            <h2>Data Representation in Modbus</h2>
             <p>Understanding how data is represented is crucial for working with Modbus, especially when interpreting request/response frames or device documentation.</p>
            <h3>Basic Units: Bits, Bytes, Words</h3>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Bit:</strong> The smallest unit of data, representing either <code>{'0'}</code> or <code>{'1'}</code>. Modbus uses bits for Discrete Inputs and Coils.</li>
                <li><strong>Byte:</strong> A group of 8 bits. Data in Modbus messages is typically organized in bytes.</li>
                <li><strong>Word (Register):</strong> In classic Modbus, this typically refers to a 16-bit unit (2 bytes). Input Registers and Holding Registers are 16-bit words.</li>
            </ul>
            <h3>Number Systems: DEC, BIN, HEX</h3>
             {/* Список для анимации li */}
            <ul>
                <li><strong>Decimal (DEC):</strong> The base-10 system we use daily (0-9).</li>
                <li><strong>Binary (BIN):</strong> The base-2 system computers use (0-1). Often prefixed with <code>{'0b'}</code>. Example: <code>{'0b1101'}</code> = 13 dec.</li>
                <li><strong>Hexadecimal (HEX):</strong> The base-16 system, using digits 0-9 and letters A-F (representing 10-15). Often prefixed with <code>{'0x'}</code> or followed by {'h'}. It&aposs commonly used because it compactly represents bytes (one byte = two hex digits, e.g., <code>{'0xFF'}</code> = 255 dec = <code>{'0b11111111'}</code> bin).</li>
            </ul>
            <p><strong>Simple Conversion Reference (0-15):</strong></p>
            <table>
                <thead> <tr><th>Decimal</th><th>Hexadecimal</th><th>Binary (4-bit)</th></tr> </thead>
                <tbody> <tr><td>0</td><td>0</td><td>0000</td></tr> <tr><td>1</td><td>1</td><td>0001</td></tr> <tr><td>2</td><td>2</td><td>0010</td></tr> <tr><td>3</td><td>3</td><td>0011</td></tr> <tr><td>4</td><td>4</td><td>0100</td></tr> <tr><td>5</td><td>5</td><td>0101</td></tr> <tr><td>6</td><td>6</td><td>0110</td></tr> <tr><td>7</td><td>7</td><td>0111</td></tr> <tr><td>8</td><td>8</td><td>1000</td></tr> <tr><td>9</td><td>9</td><td>1001</td></tr> <tr><td>10</td><td>A</td><td>1010</td></tr> <tr><td>11</td><td>B</td><td>1011</td></tr> <tr><td>12</td><td>C</td><td>1100</td></tr> <tr><td>13</td><td>D</td><td>1101</td></tr> <tr><td>14</td><td>E</td><td>1110</td></tr> <tr><td>15</td><td>F</td><td>1111</td></tr> </tbody>
            </table>
            <h3>16-bit Registers (Words)</h3>
            <p>Input and Holding registers store 16-bit unsigned values (ranging from 0 to 65535) or signed values (-32768 to +32767). These are transmitted as two bytes: a High Byte (MSB - Most Significant Byte) and a Low Byte (LSB - Least Significant Byte). For example, the decimal value <code>{'4300'}</code> (as seen in the examples) is <code>{'10CC'}</code> in Hex. This is transmitted as High Byte <code>{'10'}</code> (hex) and Low Byte <code>{'CC'}</code> (hex).</p>
            <p>The <strong>Byte Order</strong> (which byte comes first in the message - High or Low) is important. Standard Modbus typically uses <strong>Big-Endian</strong> (High Byte first), but variations exist.</p>
            <p>Larger data types, like 32-bit integers or floating-point numbers (e.g., IEEE 754 format), are handled by combining <strong>two</strong> consecutive 16-bit registers. The interpretation and byte/word order for these larger types depend heavily on the specific device implementation.</p>
        </div>
        <div className="content-section" key="data-types">
          <h2>Modbus Data Types & Addressing</h2>
           <p>Modbus devices (slaves) organize their memory into several areas for different data types. The four primary types are:</p>
          <table>
             <thead>
              <tr>
                <th>Data Type</th>
                <th>Address Range</th>
                <th>Access</th>
                <th>Size</th>
                <th>Purpose</th>
                <th>Function Codes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Discrete Outputs (Coils)</strong></td>
                <td><code>{`00001 - 09999`}</code></td>
                <td>Read/Write</td>
                <td>1 bit</td>
                <td>Control discrete outputs (relays, lights)</td>
                <td><code>{`01, 05, 15`}</code></td>
              </tr>
              <tr>
                <td><strong>Discrete Inputs (Contacts)</strong></td>
                <td><code>{`10001 - 19999`}</code></td>
                <td>Read-Only</td>
                <td>1 bit</td>
                <td>Read discrete inputs (buttons, sensors)</td>
                <td><code>{`02`}</code></td>
              </tr>
              <tr>
                <td><strong>Input Registers</strong></td>
                <td><code>{`30001 - 39999`}</code></td>
                <td>Read-Only</td>
                <td>16 bit</td>
                <td>Read analog inputs (temperature, pressure)</td>
                <td><code>{`04`}</code></td>
              </tr>
              <tr>
                <td><strong>Holding Registers</strong></td>
                <td><code>{`40001 - 49999`}</code></td>
                <td>Read/Write</td>
                <td>16 bit</td>
                <td>Store settings, intermediate values, analog outputs</td>
                <td><code>{`03, 06, 16`}</code></td>
              </tr>
            </tbody>
          </table>
          <p><strong>Important Note on Addressing:</strong></p>
          <p>Standard Modbus addressing (shown above) starts from 1 (e.g., <code>{'40001'}</code> is the first Holding Register). However, many software implementations and PDU descriptions use zero-based addressing (offset-based), where the first item has address <code>{'0'}</code>. Therefore, to access register <code>{'40001'}</code>, the address field in the request data is often set to <code>{'0000'}</code> (hex). This is a common point of confusion to be aware of during configuration! The tools below use <strong>0-based addressing</strong> for the address fields.</p>
        </div>
         <div className="content-section" key="rtu-examples">
             <h2>Modbus RTU Request/Response Examples</h2>
               <p>Let&aposs look at some examples of Modbus RTU communication (CRC values are shown symbolically as <code>{'[CRC]'}</code>).</p>
             <hr />
             <h3>Example 1: Read Coils (Function Code 01)</h3>
             <p><strong>Scenario</strong> (from Slide 17): Request the status of 13 coils, starting from address <code>{'00010'}</code> (decimal 10, 0-based address <code>{'000A'}</code> hex), from the device with Slave ID <code>{'04'}</code>.</p>
             <p><strong>Request (Master -&gt; Slave):</strong></p>
             <table><thead><tr><th>Slave ID</th><th>Function</th><th>Start Addr (Hi Lo)</th><th>Quantity (Hi Lo)</th><th>CRC</th></tr></thead><tbody><tr><td><code>{'04'}</code></td><td><code>{'01'}</code></td><td><code>{'00 0A'}</code></td><td><code>{'00 0D'}</code></td><td><code>{'[CRC]'}</code></td></tr></tbody></table>
             <p><small>Explanation: <code>{'00 0A'}</code> = 10 (0-based address), <code>{'00 0D'}</code> = 13 (quantity).</small></p>
             <p><strong>Response (Slave -&gt; Master):</strong></p>
             <table><thead><tr><th>Slave ID</th><th>Function</th><th>Byte Count</th><th>Coil Data</th><th>CRC</th></tr></thead><tbody><tr><td><code>{'04'}</code></td><td><code>{'01'}</code></td><td><code>{'02'}</code></td><td><code>{'CD 6B'}</code></td><td><code>{'[CRC]'}</code></td></tr></tbody></table>
             <p><small>Explanation: Slave <code>{'04'}</code> responds with function <code>{'01'}</code>. <code>{'02'}</code> data bytes follow, containing the status of 13 coils (remaining bits in the last byte are unused). <code>{'CD 6B'}</code> represents the coil statuses. (Note: The response data in Slide 17 (<code>{'02 36 07'}</code>) might be a typo or different example data. We use <code>{'CD 6B'}</code> as a typical bit packing example.)</small></p>
             <hr />
             <h3>Example 2: Read Input Registers (Function Code 04)</h3>
             <p><strong>Scenario</strong> (from Slide 19): Request the values of 2 Input Registers, starting from address <code>{'30033'}</code> (0-based address <code>{'0021'}</code> hex), from the device with Slave ID <code>{'11'}</code> (<code>{'0B'}</code> hex).</p>
             <p><strong>Request (Master -&gt; Slave):</strong></p>
             <table><thead><tr><th>Slave ID</th><th>Function</th><th>Start Addr (Hi Lo)</th><th>Quantity (Hi Lo)</th><th>CRC</th></tr></thead><tbody><tr><td><code>{'0B'}</code></td><td><code>{'04'}</code></td><td><code>{'00 21'}</code></td><td><code>{'00 02'}</code></td><td><code>{'[CRC]'}</code></td></tr></tbody></table>
             <p><small>Explanation: 0-based address <code>{'0021'}</code> hex = 33 dec. Requesting <code>{'0002'}</code> = 2 registers.</small></p>
             <p><strong>Response (Slave -&gt; Master):</strong></p>
             <table><thead><tr><th>Slave ID</th><th>Function</th><th>Byte Count</th><th>Register 1 Data (Hi Lo)</th><th>Register 2 Data (Hi Lo)</th><th>CRC</th></tr></thead><tbody><tr><td><code>{'0B'}</code></td><td><code>{'04'}</code></td><td><code>{'04'}</code></td><td><code>{'10 CC'}</code></td><td><code>{'20 26'}</code></td><td><code>{'[CRC]'}</code></td></tr></tbody></table>
             <p><small>Explanation: Slave <code>{'0B'}</code> responds with function <code>{'04'}</code>. <code>{'04'}</code> data bytes contain two 16-bit register values. Register at address 33 (30033) value = <code>{'10CC'}</code> hex = 4300 dec. Register at address 34 (30034) value = <code>{'2026'}</code> hex = 8230 dec. (Values match Slide 19).</small></p>
         </div>

        {/* Используем импортированный компонент Калькулятора */}
        <div key="crc-calculator">
             <CRCCalculator />
        </div>

        {/* Используем импортированный компонент Конструктора */}
        <MessageConstructor key="msg-constructor"/>

        <div className="content-section" key="study-plan">
            <h2>What we plan to study:</h2>
             {/* Список для анимации li */}
            <ul>
              <li>Network Fundamentals (OSI, TCP/IP)</li>
              <li>Modbus RTU Protocol</li>
              <li>Modbus TCP Protocol</li>
              <li>Data Representation (Bits, Bytes, Registers)</li>
              <li>Practical Tools & Simulators</li>
            </ul>
        </div>

      </div> {/* Конец div.container */}

      {/* --- Компонент Script для загрузки anime.js с CDN --- */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('Anime.js script loaded from CDN!');
          setIsAnimeLoaded(true);
        }}
        onError={(e) => {
           console.error('Error loading Anime.js script:', e);
        }}
      />
    </> // <--- Конец JSX фрагмента
  );
}