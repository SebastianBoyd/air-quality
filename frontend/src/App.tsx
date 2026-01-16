import { Component, createResource, createSignal, Show, onMount, createEffect } from 'solid-js';
import AQIMeter from "./AQIMeter";
import Bar from "./Bar";
import Circles from "./Circles";
import { OverallAQI } from "./aqi_calculations";
import MonthlyAQIChart from "./MonthlyAQIChart";

const getLocalStorageBool = (key: string) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : false;
    } catch (e) {
        return false;
    }
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
};

const App: Component = () => {
    const [indoorEnabled, setIndoorEnabled] = createSignal<boolean>(getLocalStorageBool("indoor_enabled"));

    const urls = {
        outdoorCurrent: "/api/current/1",
        outdoorHourly: "/api/hourly/1",
        outdoorDaily: "/api/daily/1",
        indoorAllowed: "/api/indoor_allowed",
        indoorCurrent: "/api/current/2",
        indoorHourly: "/api/hourly/2",
        indoorDaily: "/api/daily/2",
    };

    // Indoor Enabled Check
    createEffect(() => {
        if (!indoorEnabled()) {
            fetch(urls.indoorAllowed)
                .then(res => res.json())
                .then(data => {
                    const enabled = data === true || data === "true"; // robust check
                    setIndoorEnabled(enabled);
                    localStorage.setItem("indoor_enabled", JSON.stringify(enabled));
                })
                .catch(() => { });
        }
    });

    // Outdoor Data
    const [outdoorCurrentData] = createResource(urls.outdoorCurrent, fetcher);
    const [outdoorHourlyData] = createResource(urls.outdoorHourly, fetcher);
    const [outdoorDailyData] = createResource(urls.outdoorDaily, fetcher);

    // Indoor Data (Conditional)
    const [indoorCurrentData] = createResource(() => indoorEnabled() ? urls.indoorCurrent : null, fetcher);
    const [indoorHourlyData] = createResource(() => indoorEnabled() ? urls.indoorHourly : null, fetcher);
    const [indoorDailyData] = createResource(() => indoorEnabled() ? urls.indoorDaily : null, fetcher);

    // Derived State
    const outdoorAqi = () => {
        const data = outdoorCurrentData();
        return data ? OverallAQI(data.pm_2_5, data.pm_10_0) : NaN;
    };

    const indoorAqi = () => {
        const data = indoorCurrentData();
        return data ? OverallAQI(data.pm_2_5, data.pm_10_0) : NaN;
    };

    return (
        <div class="container">
            <h3>Outdoor AQI</h3>
            <AQIMeter aqi={outdoorAqi()} />

            <Show when={indoorEnabled()}>
                <h3>Indoor AQI</h3>
                <AQIMeter aqi={indoorAqi()} />
            </Show>

            <h3>Outdoor AQI Last 24 Hours</h3>
            <Show when={outdoorHourlyData()} fallback={<div>Loading...</div>}>
                <Bar data={outdoorHourlyData()} />
            </Show>

            <Show when={indoorEnabled()}>
                <h3>Indoor AQI Last 24 Hours</h3>
                <Show when={indoorHourlyData()} fallback={<div>Loading...</div>}>
                    <Bar data={indoorHourlyData()} />
                </Show>
            </Show>

            <h3>Outdoor AQI Last 7 Days</h3>
            <Show when={outdoorDailyData()} fallback={<div>Loading...</div>}>
                <Circles data={outdoorDailyData()} />
            </Show>

            <Show when={indoorEnabled()}>
                <h3>Indoor AQI Last 7 Days</h3>
                <Show when={indoorDailyData()} fallback={<div>Loading...</div>}>
                    <Circles data={indoorDailyData()} />
                </Show>
            </Show>

            <h3>Monthly AQI (Outdoor)</h3>
            <MonthlyAQIChart year={new Date().getFullYear()} />
        </div>
    );
};

export default App;
