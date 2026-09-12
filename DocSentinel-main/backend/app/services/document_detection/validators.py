"""Document-specific validation services."""

from app.schemas.schemas import ExtractedFields, ValidationResult


def _mrz_checksum(data: str, weights: list[int]) -> int:
    chars = "0123456789ABCDEF<"
    total = 0
    for i, c in enumerate(data):
        val = chars.index(c) if c in chars else 0
        total += val * weights[i % len(weights)]
    return total % 10


class PassportValidator:
    def validate(self, fields: ExtractedFields) -> list[ValidationResult]:
        results: list[ValidationResult] = []
        if fields.mrz_line2 and len(fields.mrz_line2) >= 10:
            doc_num = fields.mrz_line2[:9]
            check_digit = fields.mrz_line2[9] if len(fields.mrz_line2) > 9 else ""
            computed = str(_mrz_checksum(doc_num, [7, 3, 1]))
            passed = check_digit == computed or check_digit == "<"
            results.append(
                ValidationResult(
                    check="MRZ document number checksum",
                    passed=passed,
                    message="MRZ checksum valid" if passed else "MRZ checksum mismatch — potential inconsistency",
                    score_contribution=0 if passed else 15,
                )
            )

        if fields.name and fields.mrz_line1:
            name_parts = fields.name.replace(" ", "").upper()
            mrz_name = fields.mrz_line1.split("<<")[1].replace("<", "") if "<<" in fields.mrz_line1 else ""
            consistent = name_parts[:6] in mrz_name or mrz_name[:6] in name_parts
            results.append(
                ValidationResult(
                    check="Printed name ↔ MRZ consistency",
                    passed=consistent,
                    message="Name fields consistent" if consistent else "Printed name differs from MRZ — review required",
                    score_contribution=0 if consistent else 12,
                )
            )
        else:
            results.append(
                ValidationResult(
                    check="MRZ availability",
                    passed=False,
                    message="Insufficient MRZ data for full validation",
                    score_contribution=5,
                )
            )

        return results


class PANValidator:
    def validate(self, fields: ExtractedFields) -> list[ValidationResult]:
        results: list[ValidationResult] = []
        if fields.document_number:
            pan = fields.document_number.upper()
            valid_format = len(pan) == 10 and pan[:5].isalpha() and pan[5:9].isdigit() and pan[9].isalpha()
            results.append(
                ValidationResult(
                    check="PAN format",
                    passed=valid_format,
                    message="PAN format valid" if valid_format else "PAN format anomaly detected",
                    score_contribution=0 if valid_format else 10,
                )
            )
        return results


class DrivingLicenceValidator:
    def validate(self, fields: ExtractedFields) -> list[ValidationResult]:
        return [
            ValidationResult(
                check="Licence number format",
                passed=bool(fields.document_number and len(fields.document_number) >= 8),
                message="Licence number present" if fields.document_number else "Licence number not extracted",
                score_contribution=0 if fields.document_number else 8,
            )
        ]


class GenericDocumentValidator:
    def validate(self, fields: ExtractedFields) -> list[ValidationResult]:
        has_data = any([fields.name, fields.document_number, fields.date_of_birth])
        return [
            ValidationResult(
                check="Basic field extraction",
                passed=has_data,
                message="Key fields extracted" if has_data else "Insufficient extracted data",
                score_contribution=0 if has_data else 20,
            )
        ]


class DocumentValidator:
    def __init__(self) -> None:
        self._validators = {
            "passport": PassportValidator(),
            "pan": PANValidator(),
            "driving_licence": DrivingLicenceValidator(),
            "driving licence": DrivingLicenceValidator(),
        }
        self._generic = GenericDocumentValidator()

    def validate(self, doc_type: str, fields: ExtractedFields) -> list[ValidationResult]:
        validator = self._validators.get(doc_type.lower(), self._generic)
        return validator.validate(fields)


document_validator = DocumentValidator()
