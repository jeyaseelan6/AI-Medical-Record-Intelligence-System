# MedAI — Round 2
# Technical Design Document (TDD)

Version: 1.0
Status: Implementation Ready

---

## 1. Purpose

This document defines the technical architecture for extending MedAI with an AI-powered Local Doctor Recommendation Engine.

The feature begins when MedAI identifies a high-risk or low-confidence clinical issue and provides a pathway for the user to find an appropriate real-world healthcare provider nearby.

The system must:

- Identify the appropriate medical specialty from the detected clinical issue.
- Collect the user's preferred location and consultation availability.
- Retrieve real doctor/clinic information from a public real-world data source.
- Rank retrieved providers according to relevance.
- Present transparent recommendation reasoning.
- Never fabricate provider information.
- Gracefully handle unavailable, incomplete, or failed search results.

The feature extends the existing MedAI system without replacing its Round 1 clinical intelligence architecture.

---

# 2. Existing System Context

MedAI already provides:

1. Multi-modal medical document ingestion.
2. AI-based clinical entity extraction.
3. Structured patient timeline construction.
4. Medication and dosage cross-checking.
5. Longitudinal lab trend analysis.
6. Safety and inconsistency detection.
7. Evidence-grounded clinical Q&A.
8. Confidence and risk assessment.
9. PostgreSQL persistence.
10. pgvector semantic retrieval.
11. Authentication and patient data isolation.

Round 2 consumes the outputs of these systems.

It does not independently diagnose the patient.

---

# 3. Round 2 Architectural Principle

The Local Doctor Recommendation capability will be implemented as a dedicated subsystem:

Clinical Intelligence
        |
        v
Risk / Low-Confidence Signal
        |
        v
Recommendation Context Builder
        |
        v
AI Specialty & Care-Type Reasoner
        |
        v
User Location + Availability
        |
        v
Real Provider Retrieval
        |
        v
Provider Normalization
        |
        v
Recommendation Scoring Engine
        |
        v
Ranked Local Provider Results
        |
        v
Transparent Recommendation UI

The engine should operate using structured clinical evidence rather than treating the entire task as a generic chatbot conversation.

---

# 4. System Architecture

## 4.1 High-Level Architecture

```text
                    EXISTING MEDAI
                         |
              Clinical Risk Detection
                         |
                         v
              +-----------------------+
              | Recommendation        |
              | Trigger Detector      |
              +-----------------------+
                         |
                         v
              +-----------------------+
              | Clinical Context      |
              | Builder               |
              +-----------------------+
                         |
                         v
              +-----------------------+
              | AI Specialty & Care   |
              | Reasoning Engine      |
              +-----------------------+
                         |
              +----------+----------+
              |                     |
              v                     v
       User Preferences      Clinical Context
       Location              Specialty
       Availability          Care Type
              |                     |
              +----------+----------+
                         |
                         v
              +-----------------------+
              | Provider Search       |
              | Adapter               |
              +-----------------------+
                         |
                         v
              +-----------------------+
              | Provider Normalizer   |
              +-----------------------+
                         |
                         v
              +-----------------------+
              | Recommendation        |
              | Ranking Engine        |
              +-----------------------+
                         |
                         v
              +-----------------------+
              | Recommendation UI     |
              +-----------------------+
```

---

# 5. Technology Stack

The Round 2 implementation should remain consistent with the existing application.

Frontend:

- React.js
- Existing MedAI frontend architecture
- Existing authentication context
- Existing dashboard components

Backend:

- Node.js
- Express.js
- Existing modular service architecture

Database:

- PostgreSQL
- Existing NeonDB deployment
- Existing pgvector infrastructure where useful

AI:

- Existing configurable AI provider architecture
- Gemini and/or OpenAI-compatible providers
- Existing model routing configuration

External Data:

Primary implementation should use a real public provider/location API.

Possible sources:

- Google Places API
- OpenStreetMap / Nominatim
- Another legitimate public healthcare/provider directory

The implementation must not contain hardcoded fake doctors or clinics.

Hosting:

- AWS
- Existing deployment architecture

---

# 6. New Backend Modules

The following modules should be added without disturbing existing Round 1 modules.

Suggested structure:

```text
backend/src/
│
├── controllers/
│   └── recommendation.controller.js
│
├── routes/
│   └── recommendation.routes.js
│
├── services/
│   ├── recommendation.service.js
│   ├── specialty.service.js
│   ├── provider-search.service.js
│   ├── provider-ranking.service.js
│   └── location.service.js
│
└── utils/
    └── recommendation.utils.js
```

The exact filenames may be adapted to the existing codebase conventions.

---

# 7. Recommendation Trigger

The system should not display doctor recommendations continuously.

A recommendation opportunity is created when MedAI has identified:

- High-risk safety issue
- Low-confidence clinical interpretation
- Significant medication conflict
- Potential medication duplication
- Potential allergy/contraindication issue
- Concerning longitudinal trend
- Other clinically significant warning already generated by the Round 1 engine

The existing risk assessment should remain the source of truth.

Round 2 should consume the existing structured warning rather than independently reinterpreting every medical document.

---

# 8. Recommendation Context Builder

Before invoking the recommendation engine, the backend should construct a compact structured context.

Example:

```json
{
  "patientId": "patient-id",
  "riskLevel": "high",
  "issueType": "medication_interaction",
  "clinicalSummary": "Potential overlapping medication exposure detected across visits.",
  "evidence": [
    {
      "type": "medication",
      "name": "Example Drug A",
      "source": "prescription_2025.pdf"
    },
    {
      "type": "medication",
      "name": "Example Drug B",
      "source": "prescription_2026.pdf"
    }
  ],
  "confidence": 0.91
}
```

Only information necessary for recommendation should be passed to the recommendation engine.

Sensitive clinical information should not be unnecessarily exposed to external provider-search APIs.

---

# 9. AI Specialty & Care-Type Reasoning Engine

## 9.1 Objective

Determine what type of healthcare professional is most appropriate for the flagged issue.

The engine should produce structured output rather than unrestricted natural-language text.

Example:

```json
{
  "recommendedSpecialty": "Cardiology",
  "careType": "specialist",
  "reason": "The detected issue involves a persistent cardiovascular-related finding.",
  "confidence": 0.89,
  "alternativeSpecialties": [
    {
      "specialty": "Internal Medicine",
      "confidence": 0.72
    }
  ]
}
```

## 9.2 Reasoning Inputs

The engine may consider:

- Risk category
- Clinical issue type
- Relevant symptoms
- Diagnoses already extracted
- Medication conflict type
- Relevant laboratory trends
- Existing clinical evidence
- Patient age and sex where relevant
- Confidence of the original finding

## 9.3 Care-Type Mapping

The output should distinguish between:

```text
Primary care
Specialist
Pharmacist
Emergency / urgent care
Other appropriate healthcare professional
```

For example:

Medication interaction
→ pharmacist / prescribing physician

Cardiovascular concern
→ cardiologist / primary physician

Abnormal liver trend
→ gastroenterologist / hepatology-capable specialist / primary physician

General uncertain finding
→ primary care / general physician

The system must not claim that a specialty is medically mandatory.

It should frame the result as an appropriate type of professional to consider.

---

# 10. User Interaction Flow

The UI should remain simple.

When an eligible warning appears:

```text
Potential issue detected.

Consider consulting a healthcare professional.

[Find a Doctor Nearby]
```

After activation:

### Question 1

```text
Where would you like to find a doctor?

[ Enter city or area ]
```

### Question 2

```text
When are you available?

[ This week ]
[ Today ]
[ Evenings ]
[ Weekends ]
[ Flexible ]
```

The system should not require a long questionnaire.

---

# 11. Location Processing

The user may provide:

- City
- Town
- Neighborhood
- Postal area
- Recognizable locality

Example:

```text
Jaffna
Point Pedro
Colombo 07
Negombo
```

The backend should normalize the location before searching.

Example:

```json
{
  "input": "Jaffna",
  "normalizedLocation": "Jaffna, Sri Lanka",
  "latitude": 9.6615,
  "longitude": 80.0255
}
```

If the location cannot be resolved:

```text
We couldn't identify that location.
Please try a city, town, or nearby area.
```

---

# 12. Provider Search Adapter

External provider retrieval must be isolated behind a service interface.

Example:

```javascript
searchProviders({
    specialty,
    location,
    availability
})
```

The rest of the application should not depend directly on Google Places or another provider.

This allows the provider source to be replaced later.

Architecture:

```text
Recommendation Engine
        |
        v
ProviderSearchService
        |
        +---- Google Places Adapter
        |
        +---- OpenStreetMap Adapter
        |
        +---- Future Provider Adapter
```

---

# 13. Real Provider Data Requirement

Every provider displayed to the user must originate from the external provider API.

The application must never:

- Generate fake doctors
- Generate fake clinic names
- Invent ratings
- Invent phone numbers
- Invent addresses
- Invent distances
- Invent availability

If the API returns incomplete information, the UI should display only the available fields.

Example:

```text
Dr. Example Clinic
Cardiology
Jaffna, Sri Lanka

Rating: 4.5
Phone: Available
```

If rating is unavailable:

```text
Rating: Not available
```

It must not generate a substitute rating.

---

# 14. Provider Normalization

Different APIs may return different structures.

Normalize them into a common internal format:

```json
{
  "providerId": "external-id",
  "name": "Example Medical Centre",
  "specialty": "Cardiology",
  "address": "Example Street, Jaffna",
  "latitude": 9.66,
  "longitude": 80.02,
  "distanceKm": 2.4,
  "rating": 4.5,
  "ratingCount": 120,
  "phone": "+94XXXXXXXXX",
  "website": null,
  "source": "google_places"
}
```

Only fields actually returned or reliably derived from the API should be populated.

---

# 15. AI-Native Provider Ranking

The recommendation engine should not simply display the API's default ordering.

Providers should be ranked using multiple meaningful signals.

Potential ranking features:

```text
Specialty relevance
+
Location proximity
+
Provider rating
+
Number of reviews
+
Availability compatibility
+
Result completeness
```

Example conceptual score:

```text
Recommendation Score =
    Specialty Relevance
  + Location Relevance
  + Availability Compatibility
  + Reputation Signal
  + Data Completeness
```

The exact weights should be configurable.

The ranking layer should be deterministic and auditable.

AI may assist with semantic specialty matching, while numerical ranking should remain transparent and reproducible.

---

# 16. Specialty Matching

Provider search results may not use the exact same specialty terminology as the AI engine.

Example:

```text
AI:
"Cardiology"

Provider:
"Heart Specialist"
"Cardiac Specialist"
"Cardiologist"
```

The system should normalize specialty terminology before ranking.

A semantic matching layer may be used to determine whether a provider's category is relevant to the required care type.

This prevents the system from relying exclusively on exact string matching.

---

# 17. Availability Handling

The availability question is a user preference.

The system should distinguish between:

```text
User preference
```

and

```text
Verified provider availability
```

If the external API does not provide appointment availability, the system must not claim that the doctor is available.

For example:

Correct:

```text
Your preference: Evenings

This provider matches your selected area.
Please contact the clinic to confirm appointment availability.
```

Incorrect:

```text
Dr. X is available this evening.
```

unless verified through a real source.

---

# 18. Recommendation Result UI

Recommended results should be displayed as cards.

Each card should contain, when available:

```text
Provider Name
Specialty
Address
Distance
Rating
Review Count
Phone
Website / Directions
```

Example:

```text
-------------------------------------
Dr. Example Medical Centre

Cardiology

2.4 km away
4.5 ★ (120 reviews)

Example Road, Jaffna

[Call]
[Directions]
-------------------------------------
```

A small explanation may be displayed:

```text
Why this is recommended:
Matches the identified cardiovascular care area
and is located within your selected area.
```

---

# 19. Ranking Transparency

The system should avoid presenting the ranking as an unexplained AI decision.

Recommended UI:

```text
Recommended for your situation

Why:
• Relevant specialty
• Close to your selected location
• Strong public rating
```

The explanation must be based on actual ranking features.

---

# 20. No-Result Handling

If no providers are returned:

```text
We couldn't find a suitable provider in this area.

Try:
• Expanding the search area
• Choosing a nearby city
• Selecting a broader care type
```

No synthetic fallback providers should ever be inserted.

---

# 21. API Failure Handling

External APIs can fail.

Possible failures:

- Timeout
- Invalid API key
- Rate limit
- Network failure
- Provider API unavailable
- Invalid location
- Empty results

The backend should return controlled responses.

Example:

```json
{
  "success": false,
  "errorCode": "PROVIDER_SEARCH_UNAVAILABLE",
  "message": "Provider search is temporarily unavailable."
}
```

The frontend should provide a clear retry action.

---

# 22. API Security

External API credentials must never be exposed in React.

Correct:

```text
React
  |
  v
Node/Express
  |
  v
Provider API
```

Incorrect:

```text
React
  |
  v
Google API key
```

Provider API keys must be stored in environment variables.

Example:

```text
PROVIDER_API_KEY=
PROVIDER_API_BASE_URL=
```

---

# 23. Suggested API Endpoints

## Determine Recommendation

```http
POST /api/recommendations/context
```

Input:

```json
{
  "patientId": "..."
}
```

Output:

```json
{
  "success": true,
  "recommendationContext": {
    "riskLevel": "high",
    "issueType": "medication_interaction",
    "recommendedCareType": "pharmacist"
  }
}
```

---

## Search Providers

```http
POST /api/recommendations/providers/search
```

Input:

```json
{
  "patientId": "...",
  "location": "Jaffna",
  "availability": "this_week"
}
```

Output:

```json
{
  "success": true,
  "specialty": {
    "name": "Cardiology",
    "confidence": 0.89
  },
  "providers": []
}
```

---

# 24. Database Design

Round 2 should avoid storing unnecessary external provider information permanently.

A recommendation session table may be used.

Example:

```sql
CREATE TABLE recommendation_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    issue_type TEXT,
    risk_level TEXT,
    recommended_specialty TEXT,
    location_query TEXT,
    availability_preference TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

If provider results are persisted for auditing, store:

- External provider ID
- Provider source
- Search parameters
- Timestamp
- Ranking score
- Relevant returned fields

Do not treat external provider data as permanent clinical truth.

---

# 25. Privacy Boundary

Clinical information and provider-search information should remain separated.

The external provider search API should receive only what is necessary.

Example:

```text
Required:
Specialty = Cardiology
Location = Jaffna

Not required:
Patient name
Medical history
Prescription image
Patient ID
Clinical notes
```

The patient's medical documents must never be sent to a location/provider search API.

---

# 26. Safety Boundaries

The system must clearly distinguish:

```text
Clinical flag
```

from:

```text
Diagnosis
```

The system should say:

```text
A potential issue was identified in the available records.
Consider consulting an appropriate healthcare professional.
```

It should not say:

```text
You have heart disease.
```

Similarly, recommendations should not imply:

```text
This doctor will treat your condition.
```

Instead:

```text
This provider matches the relevant specialty for the flagged issue.
```

---

# 27. AI Model Responsibilities

AI should be used where reasoning adds value.

### AI responsibilities

- Clinical issue abstraction
- Specialty identification
- Care-type reasoning
- Semantic specialty matching
- Recommendation explanation generation

### Non-AI deterministic responsibilities

- Authentication
- Authorization
- API communication
- Location validation
- Provider data normalization
- Distance calculation when coordinates are available
- Numerical ranking
- Missing-data handling
- API failure handling

This separation improves reliability and auditability.

---

# 28. Recommendation Pipeline

The complete pipeline:

```text
1. Patient documents already processed
          |
2. Clinical warning generated
          |
3. Recommendation trigger detected
          |
4. Clinical context assembled
          |
5. AI determines appropriate care type
          |
6. User enters location
          |
7. User selects availability preference
          |
8. Location normalized
          |
9. Real provider API queried
          |
10. Results normalized
          |
11. Specialty relevance evaluated
          |
12. Providers ranked
          |
13. Recommendation explanations generated
          |
14. Results displayed
          |
15. User can call / navigate / contact provider
```

---

# 29. Performance Targets

Target response times:

Clinical context preparation:
< 1 second where possible

AI specialty reasoning:
< 5 seconds

Provider search:
< 5 seconds

Ranking:
< 500 ms

Total recommendation flow:
Preferably < 10 seconds after user submits location.

Timeouts should prevent external APIs from blocking the application indefinitely.

---

# 30. Testing Strategy

## 30.1 Unit Tests

Test:

- Specialty normalization
- Risk-to-care reasoning output validation
- Provider normalization
- Ranking calculations
- Missing fields
- Distance calculations
- No-result handling
- Invalid locations
- API failures

## 30.2 Integration Tests

Test:

```text
Risk → Recommendation Context
Recommendation Context → Specialty Engine
Specialty → Provider Search
Provider Search → Normalization
Normalization → Ranking
Ranking → Frontend
```

## 30.3 Real-World API Tests

Test with multiple locations:

- Large city
- Small town
- Rural/limited-result area
- Invalid location
- Location with many providers

Verify that every displayed provider originates from the actual API.

## 30.4 Clinical Scenario Tests

Examples:

```text
Medication interaction
→ Pharmacist / prescribing physician

Cardiovascular concern
→ Cardiology / primary care

Abnormal liver trend
→ Appropriate liver/GI specialist

Uncertain general finding
→ Primary care
```

These are recommendation-routing scenarios, not diagnostic rules.

---

# 31. Acceptance Criteria

The Round 2 feature is complete when:

### Core

- [ ] Existing Round 1 system continues functioning.
- [ ] High-risk/low-confidence warnings can initiate recommendation flow.
- [ ] AI determines an appropriate care type/specialty.
- [ ] User can provide location.
- [ ] User can provide availability preference.
- [ ] Real provider data is retrieved through an external API.
- [ ] No fake provider data exists.
- [ ] Providers are ranked according to transparent signals.
- [ ] Provider details are displayed clearly.
- [ ] No-result scenarios are handled.
- [ ] API failures are handled.
- [ ] Clinical disclaimer is visible.

### Security

- [ ] API keys remain server-side.
- [ ] Existing authentication remains enforced.
- [ ] Patient ownership checks remain enforced.
- [ ] Clinical data is not unnecessarily sent to external provider APIs.

### UX

- [ ] Recommendation flow requires minimal user input.
- [ ] Loading state is visible.
- [ ] Errors are understandable.
- [ ] Results are easy to compare.
- [ ] Contact/directions actions work where data is available.

---

# 32. Recommended Implementation Order

Do not implement everything simultaneously.

### Phase 1 — Foundation

Implement:

- Recommendation routes
- Recommendation controller
- Recommendation service
- Existing risk integration
- Structured recommendation context

### Phase 2 — AI Specialty Engine

Implement:

- Specialty reasoning
- Structured JSON output
- Confidence
- Alternative care type
- Validation

### Phase 3 — Real Provider Retrieval

Implement:

- Provider API adapter
- Location search
- Real result normalization
- Error handling

### Phase 4 — Ranking

Implement:

- Specialty relevance
- Distance
- Rating
- Review count
- Availability preference
- Transparent ranking

### Phase 5 — Frontend

Implement:

- Find Doctor action
- Location dialog
- Availability selection
- Loading state
- Provider cards
- No-result state
- Error state

### Phase 6 — Hardening

Perform:

- Security review
- API-key review
- Real-data validation
- Edge-case testing
- End-to-end testing
- Performance testing

---

# 33. Final Architecture

The completed MedAI architecture becomes:

```text
                 MEDICAL DOCUMENTS
                        |
                        v
              MULTI-MODAL AI EXTRACTION
                        |
                        v
              STRUCTURED CLINICAL DATA
                        |
              +---------+---------+
              |                   |
              v                   v
       LONGITUDINAL          SEMANTIC RAG
          AUDIT                   |
              |                   |
              v                   v
       SAFETY / RISK        CLINICAL Q&A
          SIGNAL
              |
              v
    +-----------------------+
    | ROUND 2               |
    | RECOMMENDATION        |
    | INTELLIGENCE ENGINE   |
    +-----------------------+
              |
       +------+------+
       |             |
       v             v
   AI Specialty   User Context
    Reasoning     Location +
                  Availability
       |             |
       +------+------+
              |
              v
       REAL PROVIDER API
              |
              v
       PROVIDER NORMALIZER
              |
              v
       RECOMMENDATION RANKER
              |
              v
       LOCAL DOCTOR RESULTS
              |
       +------+------+------+
       |             |      |
      Call       Directions Website
```

The Round 2 system therefore extends MedAI from:

"Understand the patient's historical medical records"

to:

"Understand a potential clinical concern and help the user take the next appropriate real-world healthcare step."

---

# 34. Design Principle

The implementation should follow one core rule:

AI reasons about clinical relevance.
Real-world APIs provide real providers.
Deterministic code enforces safety, correctness, security, and data integrity.

This prevents the recommendation engine from becoming another generic chatbot while keeping the system explainable, reliable, and grounded in real-world data.