import { Component, createMemo } from 'solid-js';
import { AQItoDesc } from './aqi_calculations';

interface AQIMeterProps {
    aqi: number;
}

const AQIMeter: Component<AQIMeterProps> = (props) => {
    const aqiDescription = createMemo(() => AQItoDesc(props.aqi));

    return (
        <div
            class="aqi-container"
            style={{
                "text-align": "center",
                "background-color": aqiDescription().color
            }}
        >
            <span class="aqi_text">
                {isNaN(props.aqi) ? 'Loading...' : aqiDescription().text} {isNaN(props.aqi) ? '' : props.aqi}
            </span>
            <div class="meter">
                <div
                    style={{ width: `${aqiDescription().percent}%` }}
                    class="percent"
                ></div>
            </div>
        </div>
    );
};

export default AQIMeter;
