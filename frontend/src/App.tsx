import { Component, createEffect, createResource, createSignal, onMount, Show } from 'solid-js';
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

type SensorReading = {
    pm_2_5: number | null;
    pm_10_0: number | null;
};

const fetchCurrentReading = async (url: string): Promise<SensorReading | null> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
};

const loadCurrentData = (
    snapshotUrl: string,
    liveUrl: string,
    setReading: (reading: SensorReading) => void
) => {
    let hasLiveReading = false;

    fetchCurrentReading(snapshotUrl)
        .then((snapshotReading) => {
            if (snapshotReading && !hasLiveReading) {
                setReading(snapshotReading);
            }
        })
        .catch(() => { });

    fetchCurrentReading(liveUrl)
        .then((liveReading) => {
            if (!liveReading) return;
            hasLiveReading = true;
            setReading(liveReading);
        })
        .catch(() => { });
};

const App: Component = () => {
    const [indoorEnabled, setIndoorEnabled] = createSignal<boolean>(getLocalStorageBool("indoor_enabled"));
    const [outdoorCurrentData, setOutdoorCurrentData] = createSignal<SensorReading>();
    const [indoorCurrentData, setIndoorCurrentData] = createSignal<SensorReading>();

    const urls = {
        outdoorSnapshot: "/api/current_snapshot/1",
        outdoorCurrent: "/api/current/1",
        outdoorHourly: "/api/hourly/1",
        outdoorDaily: "/api/daily/1",
        indoorAllowed: "/api/indoor_allowed",
        indoorSnapshot: "/api/current_snapshot/2",
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

    onMount(() => {
        loadCurrentData(urls.outdoorSnapshot, urls.outdoorCurrent, (reading) => setOutdoorCurrentData(reading));
    });

    createEffect(() => {
        if (indoorEnabled()) {
            loadCurrentData(urls.indoorSnapshot, urls.indoorCurrent, (reading) => setIndoorCurrentData(reading));
            return;
        }
        setIndoorCurrentData(undefined);
    });

    // Outdoor Data
    const [outdoorHourlyData] = createResource(urls.outdoorHourly, fetcher);
    const [outdoorDailyData] = createResource(urls.outdoorDaily, fetcher);

    // Indoor Data (Conditional)
    const [indoorHourlyData] = createResource(() => indoorEnabled() ? urls.indoorHourly : null, fetcher);
    const [indoorDailyData] = createResource(() => indoorEnabled() ? urls.indoorDaily : null, fetcher);

    // Derived State
    const outdoorAqi = () => {
        const data = outdoorCurrentData();
        return data && data.pm_2_5 !== null && data.pm_10_0 !== null
            ? OverallAQI(data.pm_2_5, data.pm_10_0)
            : NaN;
    };

    const indoorAqi = () => {
        const data = indoorCurrentData();
        return data && data.pm_2_5 !== null && data.pm_10_0 !== null
            ? OverallAQI(data.pm_2_5, data.pm_10_0)
            : NaN;
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
