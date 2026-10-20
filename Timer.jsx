
import { useState, useEffect } from 'react';

function Timer({ onTimeUp, onSubmit,  TotalMcqs }) {
    const [time, setTime] = useState(TotalMcqs * 60);

    useEffect(() => {
        if (time <= 0) {
            onTimeUp?.();
            return;
        }

        const interval = setInterval(() => {
            setTime((prevTime) => prevTime - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [time, onTimeUp]);

    const min = Math.floor(time / 60);
    const sec = time % 60;

    return (
        <div>
            <h2>
                Time Left: {String(min).padStart(2, '0')}:
                {String(sec).padStart(2, '0')}
            </h2>
        </div>
    );
}

export default Timer;
