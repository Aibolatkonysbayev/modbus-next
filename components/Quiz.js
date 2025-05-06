// components/Quiz.js
import React, { useState } from 'react';

// Данные квиза (лучше хранить их здесь, а не в data-атрибутах)
const quizData = [
    {
        question: "1. What does PDU stand for in the context of Modbus?",
        options: [
            { value: "pdu", text: "Protocol Data Unit" },
            { value: "padu", text: "Primary Data Unit" },
            { value: "pdu_alt", text: "Packet Data Unit" }
        ],
        correctAnswer: "pdu"
    },
    {
        question: "2. Which component is used for error checking in a Modbus RTU frame?",
        options: [
            { value: "slaveid", text: "Slave ID" },
            { value: "func", text: "Function Code" },
            { value: "crc", text: "CRC Check" },
            { value: "mbap", text: "MBAP Header" }
        ],
        correctAnswer: "crc"
    },
    {
        question: "3. Which component is specific to Modbus TCP and is NOT present in Modbus RTU?",
        options: [
            { value: "func", text: "Function Code" },
            { value: "data", text: "Data" },
            { value: "crc", text: "CRC Check" },
            { value: "mbap", text: "MBAP Header" }
        ],
        correctAnswer: "mbap"
    }
];

function Quiz() {
    // Состояние для хранения выбранных ответов { q0: '', q1: '', q2: '' }
    const [selectedAnswers, setSelectedAnswers] = useState({});
    // Состояние для отображения результатов
    const [showResults, setShowResults] = useState(false);
    // Состояние для текста результата
    const [resultText, setResultText] = useState('');
    // Состояние для CSS класса результата ('pass', 'fail', 'incomplete')
    const [resultClass, setResultClass] = useState('');

    // Обработчик изменения выбора варианта ответа
    const handleOptionChange = (questionIndex, value) => {
        setSelectedAnswers(prevAnswers => ({
            ...prevAnswers,
            [`q${questionIndex}`]: value // Сохраняем ответ для вопроса с индексом questionIndex
        }));
        // Сбрасываем результаты при изменении ответа
        setShowResults(false);
        setResultText('');
        setResultClass('');
    };

    // Обработчик нажатия кнопки "Check Answers"
    const handleCheckAnswers = () => {
        let score = 0;
        let answeredCount = 0;

        // Подсчет правильных ответов и количества отвеченных вопросов
        quizData.forEach((questionData, index) => {
            const userAnswer = selectedAnswers[`q${index}`];
            if (userAnswer) {
                answeredCount++;
                if (userAnswer === questionData.correctAnswer) {
                    score++;
                }
            }
        });

        // Проверка, все ли вопросы отвечены
        if (answeredCount < quizData.length) {
            setResultText(`Please answer all questions. (${score} out of ${quizData.length} correct so far)`);
            setResultClass('fail'); // Можно использовать 'incomplete' или 'fail'
        } else {
            // Все вопросы отвечены, показываем итоговый счет
            setResultText(`Your score: ${score} out of ${quizData.length}`);
            if (score === quizData.length) {
                setResultClass('pass');
            } else {
                setResultClass('fail');
            }
        }
        // Показываем блок с результатами и подсвечиваем ответы
        setShowResults(true);
    };

    // --- JSX разметка компонента ---
    return (
        <div className="quiz-section">
            <h3>Knowledge Check: Message Structure</h3>

            {quizData.map((item, index) => (
                <div className="quiz-question" key={index}>
                    <p><strong>{item.question}</strong></p>
                    <div className="quiz-options">
                        {item.options.map((option) => {
                            const isChecked = selectedAnswers[`q${index}`] === option.value;
                            let labelClassName = '';
                            // Подсветка после нажатия кнопки "Check"
                            if (showResults) {
                                const isCorrect = option.value === item.correctAnswer;
                                if (isChecked) {
                                    labelClassName = isCorrect ? 'correct' : 'incorrect';
                                } else if (isCorrect) {
                                     // Можно подсветить правильный, если пользователь ответил неверно
                                     // labelClassName = 'correct'; // Раскомментируйте, если хотите всегда подсвечивать верный
                                }
                            }

                            return (
                                <label key={option.value} className={labelClassName}>
                                    <input
                                        type="radio"
                                        name={`q${index}`} // Уникальное имя для группы radio button
                                        value={option.value}
                                        checked={isChecked}
                                        onChange={() => handleOptionChange(index, option.value)}
                                    />
                                    {option.text}
                                    {/* Отображение значков после проверки */}
                                    {showResults && labelClassName === 'correct' && ' ✔️ Correct!'}
                                    {showResults && labelClassName === 'incorrect' && ' ❌ Incorrect'}
                                </label>
                            );
                        })}
                    </div>
                    {/* Убрали feedback под каждым вопросом для простоты */}
                    {/* <div className="quiz-feedback"></div> */}
                </div>
            ))}

            <button type="button" className="check-quiz-btn" onClick={handleCheckAnswers}>
                Check Answers
            </button>

             {/* Отображение общего результата */}
            {showResults && (
                <div className={`quiz-results ${resultClass}`}>
                    {resultText}
                </div>
            )}
             {/* Пустой div для сохранения места, если результаты не показаны */}
             {!showResults && <div className="quiz-results" style={{ minHeight: '1.5em', border: 'none' }}></div>}

        </div>
    );
}

export default Quiz;