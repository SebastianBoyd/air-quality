DEVICE_URLS = {
    "1": "http://pacific.sebastianboyd.com:8717/json",
    "2": "http://pacific.sebastianboyd.com:8626/json",
}


def get_device_url(device_id: str):
    return DEVICE_URLS.get(device_id)


def get_all_device_ids():
    return list(DEVICE_URLS.keys())
