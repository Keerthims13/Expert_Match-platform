# Expert Profile API

## Create Expert Profile

- Method: `POST`
- Endpoint: `/api/experts/profile`

Request body:

```json
{
  "userId": 2,
  "fullName": "Dr. Aris Thorne",
  "skills": "Cloud Architecture, AWS, Kubernetes",
  "pricePerMinute": 3.5,
  "availabilityStatus": "available"
}
```

Rules:

- `userId` must be a positive integer.
- `skills` can be comma-separated string or string array.
- `pricePerMinute` must be greater than 0.
- `availabilityStatus` must be one of: `available`, `busy`, `offline`.
- Only one expert profile per `userId`.

Success response (`201`):

```json
{
  "message": "Expert profile created successfully",
  "data": {
    "id": 2,
    "userId": 2,
    "fullName": "Dr. Aris Thorne",
    "pricePerMinute": 3.5,
    "availabilityStatus": "available",
    "specialties": ["Cloud Architecture", "AWS", "Kubernetes"]
  }
}
```

Conflict response (`409`):

```json
{
  "message": "An expert profile already exists for this userId"
}
```

## Get Expert Profile

- Method: `GET`
- Endpoint: `/api/experts/:identifier`
- `identifier` is expert slug or numeric id

Not found response (`404`):

```json
{
  "message": "Expert profile not found"
}
```
